// ============================================
// Arduino UNO R4 WiFi Storage Unit (FINAL FIX)
// ============================================

#include <WiFiS3.h>
#include <ArduinoHttpClient.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Adafruit_MLX90614.h>

// WiFi
const char* ssid = "WIN-4MG19B8RE4H 2558";
const char* password = "Mawulolo24";

// Supabase (UNCHANGED)
const char* supabaseUrl = "https://ejaiyndbvvqnnvmdunkh.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqYWl5bmRidnZxbm52bWR1bmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDkwNjEsImV4cCI6MjA5MDc4NTA2MX0.Q5JbIjfOZhdcupy2sHZDb-Qw0wl70k7P48F62IGXFS4";
const char* deviceId = "0ea0088c-86ff-4b55-9bc1-201660e2da2e";
const char* deviceKey = "18712ac9-71bc-4aff-8e84-80271c8e1724";

// Pins
static const uint8_t MQ135_A0 = A0;
static const uint8_t MQ135_DOUT = 2;

static const uint8_t DHT_PIN = 3;
static const uint8_t DHT_TYPE = DHT22;

static const uint8_t LCD_ADDR = 0x27;

static const uint8_t RFID_SS = 10;
static const uint8_t RFID_RST = 9;

static const uint8_t RELAY_1 = 8;
static const uint8_t RELAY_2 = 7;
static const uint8_t RELAY_3 = 6;
static const uint8_t RELAY_4 = 5;

// Objects
LiquidCrystal_I2C lcd(LCD_ADDR, 16, 4);
DHT dht(DHT_PIN, DHT_TYPE);
MFRC522 rfid(RFID_SS, RFID_RST);
Adafruit_MLX90614 mlx;

// State
String lastRfid = "----";
unsigned long lastDisplaySwap = 0;
bool displayMode = false;

// =========================
// Helper: host
// =========================
String getHostFromUrl(const String& url) {
  int start = url.indexOf("://");
  start = (start < 0) ? 0 : start + 3;
  int end = url.indexOf('/', start);
  if (end < 0) end = url.length();
  return url.substring(start, end);
}

// =========================
// HTTP POST
// =========================
bool postJson(const String& body) {
  if (WiFi.status() != WL_CONNECTED) return false;

  String host = getHostFromUrl(String(supabaseUrl));

  WiFiSSLClient client;
  HttpClient http(client, host.c_str(), 443);

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
  http.stop();

  Serial.print("API Status: ");
  Serial.println(status);

  return status >= 200 && status < 300;
}

// =========================
// Senders
// =========================
void sendHeartbeat() {
  String body = String("{\"type\":\"heartbeat\",\"ip\":\"") +
                WiFi.localIP().toString() + "\"}";
  postJson(body);
}

void sendReadings(float t, float h, float ir, int air, int airD) {
  String body =
    String("{\"type\":\"readings\",\"ip\":\"") + WiFi.localIP().toString() + "\",\"readings\":["
    "{\"sensor_type\":\"temperature\",\"value\":" + String(t,1) + ",\"unit\":\"C\"},"
    "{\"sensor_type\":\"humidity\",\"value\":" + String(h,1) + ",\"unit\":\"%\"},"
    "{\"sensor_type\":\"ir_temp\",\"value\":" + String(ir,1) + ",\"unit\":\"C\"},"
    "{\"sensor_type\":\"mq135\",\"value\":" + String(air) + ",\"unit\":\"raw\"},"
    "{\"sensor_type\":\"mq135_dout\",\"value\":" + String(airD) + ",\"unit\":\"level\"}"
    "]}";

  postJson(body);
}

void sendRfid(uint32_t uid) {
  String body =
    String("{\"type\":\"readings\",\"ip\":\"") + WiFi.localIP().toString() +
    "\",\"readings\":[{\"sensor_type\":\"rfid_uid\",\"value\":" +
    String(uid) + ",\"unit\":\"dec\"}]}");

  postJson(body);
}

// =========================
// RFID helper
// =========================
uint32_t uidToNumber(MFRC522::Uid* uid) {
  uint32_t value = 0;
  for (byte i = 0; i < uid->size; i++) {
    value = (value << 8) | uid->uidByte[i];
  }
  return value;
}

// =========================
// LCD
// =========================
void showLCD(String a, String b, String c, String d) {
  lcd.clear();
  lcd.setCursor(0,0); lcd.print(a);
  lcd.setCursor(0,1); lcd.print(b);
  lcd.setCursor(0,2); lcd.print(c);
  lcd.setCursor(0,3); lcd.print(d);
}

// =========================
// Fan control
// =========================
void setFans(float temp) {
  if (isnan(temp)) return;

  bool on = temp >= 24.0 && temp < 30.0;
  digitalWrite(RELAY_1, on);
  digitalWrite(RELAY_2, on);
}

// =========================
// SETUP
// =========================
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

  lcd.print("Connecting WiFi");

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected: " + WiFi.localIP().toString());

  sendHeartbeat();
}

// =========================
// LOOP
// =========================
void loop() {

  // FIX: no WiFi.reconnect() on UNO R4 WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost. Reconnecting...");
    WiFi.begin(ssid, password);
    delay(3000);
    return;
  }

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  float ir = mlx.readObjectTempC();
  int air = analogRead(MQ135_A0);
  int airD = digitalRead(MQ135_DOUT);

  setFans(t);

  if (!isnan(t) && !isnan(h)) {
    sendReadings(t, h, ir, air, airD);
  }

  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    uint32_t uid = uidToNumber(&rfid.uid);
    lastRfid = String(uid);
    sendRfid(uid);

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  }

  if (millis() - lastDisplaySwap > 2000) {
    displayMode = !displayMode;
    lastDisplaySwap = millis();
  }

  if (displayMode) {
    showLCD(
      "T:" + String(t,1) + "C H:" + String(h,0) + "%",
      "IR:" + String(ir,1) + "C",
      "Air:" + String(air),
      "RFID:" + lastRfid
    );
  } else {
    showLCD(
      "Storage OK",
      "RFID:" + lastRfid,
      "WiFi OK",
      WiFi.localIP().toString()
    );
  }

  sendHeartbeat();
  delay(30000);
}
