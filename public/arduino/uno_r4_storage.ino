// ============================================
// Arduino UNO R4 WiFi Storage Unit
// Sensors: MQ gas, DHT11, RFID, LCD, Relay
// ============================================

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <SPI.h>
#include <MFRC522.h>
#include <WiFiS3.h>
#include <ArduinoHttpClient.h>

// WiFi
const char* ssid = "WIN-4MG19B8RE4H 2558";
const char* password = "Mawulolo24";

// Supabase
const char* supabaseUrl = "https://ejaiyndbvvqnnvmdunkh.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqYWl5bmRidnZxbm52bWR1bmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDkwNjEsImV4cCI6MjA5MDc4NTA2MX0.Q5JbIjfOZhdcupy2sHZDb-Qw0wl70k7P48F62IGXFS4";
const char* deviceId = "0ea0088c-86ff-4b55-9bc1-201660e2da2e";
const char* deviceKey = "18712ac9-71bc-4aff-8e84-80271c8e1724";

// Pins
#define MQ_AO A0
#define MQ_DO 2

#define DHT_PIN 4
#define DHT_TYPE DHT11

#define RFID_SS_PIN 10
#define RFID_RST_PIN 9

#define LOCK_RELAY 5
#define RELAY_ACTIVE_LOW true

// Objects
LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(DHT_PIN, DHT_TYPE);
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);

// Auth UID
byte authorizedUID[] = {0xD1, 0x65, 0x58, 0x24};

// State
unsigned long lastSensorUpdate = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastWifiAttempt = 0;
String lastRfid = "----";

void relayOn(int pin) {
  digitalWrite(pin, RELAY_ACTIVE_LOW ? LOW : HIGH);
}

void relayOff(int pin) {
  digitalWrite(pin, RELAY_ACTIVE_LOW ? HIGH : LOW);
}

bool isAuthorizedCard() {
  if (rfid.uid.size != 4) return false;
  for (byte i = 0; i < 4; i++) {
    if (rfid.uid.uidByte[i] != authorizedUID[i]) return false;
  }
  return true;
}

String getHostFromUrl(const String& url) {
  int start = url.indexOf("://");
  start = (start < 0) ? 0 : start + 3;
  int end = url.indexOf('/', start);
  if (end < 0) end = url.length();
  return url.substring(start, end);
}

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

void sendHeartbeat() {
  String body = String("{\"type\":\"heartbeat\",\"ip\":\"") +
                WiFi.localIP().toString() + "\"}";
  postJson(body);
}

void sendReadings(float temperature, float humidity, int gasAnalog, int gasDigital) {
  if (isnan(temperature) || isnan(humidity)) return;

  String body =
    String("{\"type\":\"readings\",\"ip\":\"") + WiFi.localIP().toString() + "\",\"readings\":["
    "{\"sensor_type\":\"temperature\",\"value\":" + String(temperature, 1) + ",\"unit\":\"C\"},"
    "{\"sensor_type\":\"humidity\",\"value\":" + String(humidity, 1) + ",\"unit\":\"%\"},"
    "{\"sensor_type\":\"mq135\",\"value\":" + String(gasAnalog) + ",\"unit\":\"raw\"},"
    "{\"sensor_type\":\"mq135_dout\",\"value\":" + String(gasDigital) + ",\"unit\":\"level\"}"
    "]}";

  postJson(body);
}

void sendRfid(uint32_t uid) {
  String body =
    String("{\"type\":\"readings\",\"ip\":\"") + WiFi.localIP().toString() +
    "\",\"readings\":[{\"sensor_type\":\"rfid_uid\",\"value\":" +
    String(uid) + ",\"unit\":\"dec\"}]}";

  postJson(body);
}

uint32_t uidToNumber(MFRC522::Uid* uid) {
  uint32_t value = 0;
  for (byte i = 0; i < uid->size; i++) {
    value = (value << 8) | uid->uidByte[i];
  }
  return value;
}

void showSensorValues(float temperature, float humidity, int gasAnalog, int gasDigital) {
  Serial.print("Gas AO: ");
  Serial.print(gasAnalog);
  Serial.print(" | Gas DO: ");
  Serial.print(gasDigital);
  Serial.print(" | Temp: ");
  Serial.print(temperature);
  Serial.print(" C | Humidity: ");
  Serial.print(humidity);
  Serial.println(" %");

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("G:");
  lcd.print(gasAnalog);
  lcd.print(" T:");

  if (isnan(temperature)) {
    lcd.print("ERR");
  } else {
    lcd.print(temperature, 0);
    lcd.print("C");
  }

  lcd.setCursor(0, 1);
  lcd.print("H:");

  if (isnan(humidity)) {
    lcd.print("ERR");
  } else {
    lcd.print(humidity, 0);
    lcd.print("%");
  }

  lcd.print(" ");

  if (gasDigital == LOW) {
    lcd.print("GAS");
  } else {
    lcd.print("OK");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(MQ_DO, INPUT);
  pinMode(LOCK_RELAY, OUTPUT);
  relayOff(LOCK_RELAY);

  Wire.begin();
  lcd.init();
  lcd.backlight();
  lcd.clear();

  dht.begin();
  SPI.begin();
  rfid.PCD_Init();

  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");
  lcd.setCursor(0, 1);
  lcd.print("Please wait");

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected: " + WiFi.localIP().toString());

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("System Ready");
  lcd.setCursor(0, 1);
  lcd.print("Scan Card");

  Serial.println("System started");
  Serial.println("Using DHT11");
  Serial.println("Authorized UID: D1 65 58 24");

  sendHeartbeat();
  lastHeartbeat = millis();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    unsigned long now = millis();
    if (now - lastWifiAttempt > 5000) {
      lastWifiAttempt = now;
      Serial.println("WiFi lost. Reconnecting...");
      WiFi.begin(ssid, password);
    }
    delay(500);
    return;
  }

  if (millis() - lastSensorUpdate >= 2000) {
    lastSensorUpdate = millis();
    int gasAnalog = analogRead(MQ_AO);
    int gasDigital = digitalRead(MQ_DO);
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    showSensorValues(temperature, humidity, gasAnalog, gasDigital);
    sendReadings(temperature, humidity, gasAnalog, gasDigital);
  }

  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    Serial.print("Card UID: ");

    for (byte i = 0; i < rfid.uid.size; i++) {
      if (rfid.uid.uidByte[i] < 0x10) {
        Serial.print("0");
      }
      Serial.print(rfid.uid.uidByte[i], HEX);
      Serial.print(" ");
    }

    Serial.println();

    uint32_t uid = uidToNumber(&rfid.uid);
    lastRfid = String(uid);
    sendRfid(uid);

    if (isAuthorizedCard()) {
      Serial.println("Access granted - unlocked");

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Access Granted");
      lcd.setCursor(0, 1);
      lcd.print("Unlocked");

      relayOn(LOCK_RELAY);
      delay(3000);
      relayOff(LOCK_RELAY);
    } else {
      Serial.println("Access denied");

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Access Denied");
      lcd.setCursor(0, 1);
      lcd.print("Unknown Card");

      delay(2000);
    }

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();

    lastSensorUpdate = 0;
  }

  if (millis() - lastHeartbeat >= 30000) {
    lastHeartbeat = millis();
    sendHeartbeat();
  }
}
