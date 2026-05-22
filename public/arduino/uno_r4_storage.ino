// ============================================
// Arduino UNO R4 WiFi Storage Unit
// Device Type: uno_r4_storage
// Sensors: DHT22, MQ135, RC522 RFID, MLX90614, 16x4 I2C LCD
// Relays: 4-channel module (use IN1/IN2 only)
// ============================================

#include <WiFiS3.h>
#include <ArduinoHttpClient.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Adafruit_MLX90614.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

const char* supabaseUrl = "https://YOUR_PROJECT.supabase.co";
const char* supabaseKey = "YOUR_SUPABASE_ANON_KEY";
const char* deviceId = "YOUR_DEVICE_ID";
const char* deviceKey = "YOUR_DEVICE_KEY";

// MQ135
static const uint8_t MQ135_A0 = A0;
static const uint8_t MQ135_DOUT = 2;

// DHT22
static const uint8_t DHT_PIN = 3;
static const uint8_t DHT_TYPE = DHT22;

// I2C LCD + MLX90614
static const uint8_t LCD_ADDR = 0x27;

// RC522 RFID (SPI)
static const uint8_t RFID_SS = 10;
static const uint8_t RFID_RST = 9;

// Relays
static const uint8_t RELAY_1 = 8;
static const uint8_t RELAY_2 = 7;
static const uint8_t RELAY_3 = 6;
static const uint8_t RELAY_4 = 5;

LiquidCrystal_I2C lcd(LCD_ADDR, 16, 4);
DHT dht(DHT_PIN, DHT_TYPE);
MFRC522 rfid(RFID_SS, RFID_RST);
Adafruit_MLX90614 mlx = Adafruit_MLX90614();

String lastRfid = "----";
unsigned long lastDisplaySwap = 0;
bool displayMode = false;

String getHostFromUrl(const String& url) {
  int start = url.indexOf("://");
  start = (start < 0) ? 0 : start + 3;
  int end = url.indexOf('/', start);
  if (end < 0) end = url.length();
  return url.substring(start, end);
}

bool postJsonToHarvestIQ(const String& body) {
  if (WiFi.status() != WL_CONNECTED) return false;

  String host = getHostFromUrl(String(supabaseUrl));
  WiFiSSLClient wifi;
  HttpClient http(wifi, host.c_str(), 443);

  http.beginRequest();
  http.post("/functions/v1/esp32-ingest");
  http.sendHeader("Content-Type", "application/json");
  http.sendHeader("apikey", supabaseKey);
  http.sendHeader("Authorization", String("Bearer ") + supabaseKey);
  http.sendHeader("x-device-id", deviceId);
  http.sendHeader("x-device-key", deviceKey);
  http.sendHeader("Content-Length", body.length());
  http.beginBody();
  http.print(body);
  http.endRequest();

  int status = http.responseStatusCode();
  String response = http.responseBody();
  Serial.print("Harvest IQ API: ");
  Serial.print(status);
  Serial.print(" ");
  Serial.println(response);
  http.stop();

  return status >= 200 && status < 300;
}

void sendHeartbeat() {
  String body = String("{\"type\":\"heartbeat\",\"ip\":\"") + WiFi.localIP().toString() + "\"}";
  postJsonToHarvestIQ(body);
}

void sendReadings(float tempC, float humidity, float irTempC, int airRaw, int airDout) {
  String readings = String("[") +
    "{\"sensor_type\":\"temperature\",\"value\":" + String(tempC, 1) + ",\"unit\":\"C\"}," +
    "{\"sensor_type\":\"humidity\",\"value\":" + String(humidity, 1) + ",\"unit\":\"%\"}," +
    "{\"sensor_type\":\"ir_temp\",\"value\":" + String(irTempC, 1) + ",\"unit\":\"C\"}," +
    "{\"sensor_type\":\"mq135\",\"value\":" + String(airRaw) + ",\"unit\":\"raw\"}," +
    "{\"sensor_type\":\"mq135_dout\",\"value\":" + String(airDout) + ",\"unit\":\"level\"}" +
  "]";
  String body = String("{\"type\":\"readings\",\"ip\":\"") + WiFi.localIP().toString() + "\",\"readings\":" + readings + "}";
  postJsonToHarvestIQ(body);
}

void sendRfid(uint32_t uidValue) {
  String readings = String("[") +
    "{\"sensor_type\":\"rfid_uid\",\"value\":" + String(uidValue) + ",\"unit\":\"dec\"}" +
  "]";
  String body = String("{\"type\":\"readings\",\"ip\":\"") + WiFi.localIP().toString() + "\",\"readings\":" + readings + "}";
  postJsonToHarvestIQ(body);
}

uint32_t uidToNumber(MFRC522::Uid* uid) {
  uint32_t value = 0;
  for (byte i = 0; i < uid->size; i++) {
    value = (value << 8) | uid->uidByte[i];
  }
  return value;
}

void showLine(const String& l1, const String& l2, const String& l3, const String& l4) {
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(l1);
  lcd.setCursor(0, 1); lcd.print(l2);
  lcd.setCursor(0, 2); lcd.print(l3);
  lcd.setCursor(0, 3); lcd.print(l4);
}

void setFansForTemp(float tempC) {
  if (isnan(tempC)) return;

  bool fansOn = tempC >= 24.0 && tempC < 30.0;
  digitalWrite(RELAY_1, fansOn ? HIGH : LOW);
  digitalWrite(RELAY_2, fansOn ? HIGH : LOW);
}

void setup() {
  Serial.begin(115200);

  pinMode(MQ135_DOUT, INPUT);
  pinMode(RELAY_1, OUTPUT);
  pinMode(RELAY_2, OUTPUT);
  pinMode(RELAY_3, OUTPUT);
  pinMode(RELAY_4, OUTPUT);

  digitalWrite(RELAY_1, LOW);
  digitalWrite(RELAY_2, LOW);
  digitalWrite(RELAY_3, LOW);
  digitalWrite(RELAY_4, LOW);

  Wire.begin();
  lcd.init();
  lcd.backlight();
  dht.begin();
  mlx.begin();
  SPI.begin();
  rfid.PCD_Init();

  lcd.setCursor(0, 0);
  lcd.print("Storage Unit");
  lcd.setCursor(0, 1);
  lcd.print("Connecting...");

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.print("\nIP: ");
  Serial.println(WiFi.localIP());

  sendHeartbeat();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
    delay(2000);
    return;
  }

  float tempC = dht.readTemperature();
  float humidity = dht.readHumidity();
  float irTemp = mlx.readObjectTempC();
  int airRaw = analogRead(MQ135_A0);
  int airDout = digitalRead(MQ135_DOUT);

  setFansForTemp(tempC);

  if (!isnan(tempC) && !isnan(humidity)) {
    sendReadings(tempC, humidity, irTemp, airRaw, airDout);
  }

  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    uint32_t uidValue = uidToNumber(&rfid.uid);
    lastRfid = String(uidValue);
    sendRfid(uidValue);
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  }

  unsigned long now = millis();
  if (now - lastDisplaySwap > 2000) {
    displayMode = !displayMode;
    lastDisplaySwap = now;
  }

  if (displayMode) {
    String l1 = String("T:") + String(tempC, 1) + "C H:" + String(humidity, 0) + "%";
    String l2 = String("IR:") + String(irTemp, 1) + "C";
    String l3 = String("Air:") + String(airRaw) + " D:" + String(airDout);
    String l4 = String("RFID:") + lastRfid;
    showLine(l1, l2, l3, l4);
  } else {
    showLine("Storage OK", "Last RFID:", lastRfid, "WiFi:" + WiFi.localIP().toString());
  }

  sendHeartbeat();
  delay(30000);
}
