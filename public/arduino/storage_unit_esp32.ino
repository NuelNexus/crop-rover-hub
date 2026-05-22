// ============================================
// ESP32 Storage Unit
// Device Type: storage_unit
// Sensors: DHT11, MQ135, MFRC522 RFID, LCD 16x2 (I2C)
// ============================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

const char* supabaseUrl = "https://ejaiyndbvvqnnvmdunkh.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqYWl5bmRidnZxbm52bWR1bmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDkwNjEsImV4cCI6MjA5MDc4NTA2MX0.Q5JbIjfOZhdcupy2sHZDb-Qw0wl70k7P48F62IGXFS4";
const char* deviceId = "0ea0088c-86ff-4b55-9bc1-201660e2da2e";
const char* deviceKey = "18712ac9-71bc-4aff-8e84-80271c8e1724";

// Pins (ESP32)
#define DHT_PIN 4
#define DHT_TYPE DHT11
#define MQ135_PIN 34
#define RFID_SS_PIN 5
#define RFID_RST_PIN 27

LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(DHT_PIN, DHT_TYPE);
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);

bool postJsonToHarvestIQ(const String& body) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = String(supabaseUrl) + "/functions/v1/esp32-ingest";
  if (!http.begin(client, url)) {
    Serial.println("HTTP begin failed");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", String("Bearer ") + supabaseKey);
  http.addHeader("x-device-id", deviceId);
  http.addHeader("x-device-key", deviceKey);

  int code = http.POST(body);
  String response = http.getString();
  Serial.printf("Harvest IQ API: %d %s\n", code, response.c_str());
  http.end();
  return code >= 200 && code < 300;
}

void sendHeartbeat() {
  String body = String("{\"type\":\"heartbeat\",\"ip\":\"") + WiFi.localIP().toString() + "\"}";
  postJsonToHarvestIQ(body);
}

String lastRfid = "----";
unsigned long lastDisplaySwap = 0;
bool displayMode = false;

void showLine(const String& line1, const String& line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}

void sendReadings(float tempC, float humidity, int airRaw) {
  String readings = String("[") +
    "{\"sensor_type\":\"temperature\",\"value\":" + String(tempC, 1) + ",\"unit\":\"C\"}," +
    "{\"sensor_type\":\"humidity\",\"value\":" + String(humidity, 1) + ",\"unit\":\"%\"}," +
    "{\"sensor_type\":\"mq135\",\"value\":" + String(airRaw) + ",\"unit\":\"raw\"}" +
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

uint32_t uidToNumber(MFRC522::Uid *uid) {
  uint32_t value = 0;
  for (byte i = 0; i < uid->size; i++) {
    value = (value << 8) | uid->uidByte[i];
  }
  return value;
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(1000); Serial.println("Connecting..."); }
  Serial.print("Connected! IP: "); Serial.println(WiFi.localIP());

  Wire.begin();
  lcd.init();
  lcd.backlight();
  dht.begin();

  SPI.begin();
  rfid.PCD_Init();

  showLine("Storage Unit", "Booting...");
  sendHeartbeat();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) { WiFi.reconnect(); delay(3000); return; }

  float tempC = dht.readTemperature();
  float humidity = dht.readHumidity();
  int airRaw = analogRead(MQ135_PIN);

  if (!isnan(tempC) && !isnan(humidity)) {
    sendReadings(tempC, humidity, airRaw);
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
    String l2 = String("Air:") + String(airRaw) + " RFID:" + lastRfid;
    showLine(l1, l2);
  } else {
    showLine("Storage OK", "Last RFID:" + lastRfid);
  }

  sendHeartbeat();
  delay(30000);
}
