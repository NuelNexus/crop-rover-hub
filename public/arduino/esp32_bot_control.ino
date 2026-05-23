// ============================================
// ESP32 Bot Control Bridge (UART -> CropRover Arduino)
// Device Type: esp32_bot_control
// - Receives HTTP POST /drive from the web app
// - Sends "direction,speed" over UART to the Arduino
// ============================================

#include <WiFi.h>
#include <WebServer.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

const char* supabaseUrl = "https://ejaiyndbvvqnnvmdunkh.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqYWl5bmRidnZxbm52bWR1bmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDkwNjEsImV4cCI6MjA5MDc4NTA2MX0.Q5JbIjfOZhdcupy2sHZDb-Qw0wl70k7P48F62IGXFS4";
const char* deviceId = "0ea0088c-86ff-4b55-9bc1-201660e2da2e";
const char* deviceKey = "18712ac9-71bc-4aff-8e84-80271c8e1724";

// UART pins (default Serial2 on ESP32)
static const int UART_RX = 16;
static const int UART_TX = 17;
static const unsigned long HEARTBEAT_INTERVAL_MS = 15000;

WebServer server(80);

unsigned long lastHeartbeatAt = 0;
String lastCommand = "stop,0";

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

bool extractJsonString(const String& body, const String& key, String& out) {
  int keyIndex = body.indexOf("\"" + key + "\"");
  if (keyIndex < 0) return false;
  int colon = body.indexOf(':', keyIndex);
  if (colon < 0) return false;
  int firstQuote = body.indexOf('"', colon + 1);
  if (firstQuote < 0) return false;
  int secondQuote = body.indexOf('"', firstQuote + 1);
  if (secondQuote < 0) return false;
  out = body.substring(firstQuote + 1, secondQuote);
  return true;
}

bool extractJsonInt(const String& body, const String& key, int& out) {
  int keyIndex = body.indexOf("\"" + key + "\"");
  if (keyIndex < 0) return false;
  int colon = body.indexOf(':', keyIndex);
  if (colon < 0) return false;
  int start = colon + 1;
  while (start < body.length() && (body[start] == ' ' || body[start] == '"')) start++;
  int end = start;
  while (end < body.length() && isDigit(body[end])) end++;
  if (start == end) return false;
  out = body.substring(start, end).toInt();
  return true;
}

bool isDirectionAllowed(const String& direction) {
  return direction == "forward" || direction == "backward" || direction == "left" || direction == "right" || direction == "stop";
}

void sendCommandToArduino(const String& direction, int speed) {
  int clampedSpeed = constrain(speed, 0, 100);
  String payload = direction + "," + String(clampedSpeed) + "\n";
  Serial2.print(payload);
  lastCommand = direction + "," + String(clampedSpeed);
  Serial.printf("UART -> %s\n", payload.c_str());
}

void handleDrive() {
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"missing body\"}");
    return;
  }

  String body = server.arg("plain");
  String direction;
  int speed = 0;

  if (!extractJsonString(body, "direction", direction)) {
    server.send(400, "application/json", "{\"error\":\"missing direction\"}");
    return;
  }

  direction.toLowerCase();
  if (!isDirectionAllowed(direction)) {
    server.send(400, "application/json", "{\"error\":\"invalid direction\"}");
    return;
  }

  if (!extractJsonInt(body, "speed", speed)) {
    speed = 0;
  }

  sendCommandToArduino(direction, speed);
  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

void handleStatus() {
  String body = String("{\"ip\":\"") + WiFi.localIP().toString() + "\",\"last_command\":\"" + lastCommand + "\"}";
  server.send(200, "application/json", body);
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, UART_RX, UART_TX);

  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.print("\nIP: ");
  Serial.println(WiFi.localIP());

  server.on("/drive", HTTP_POST, handleDrive);
  server.on("/status", HTTP_GET, handleStatus);
  server.begin();

  sendHeartbeat();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
    delay(3000);
    return;
  }

  server.handleClient();

  unsigned long now = millis();
  if (now - lastHeartbeatAt > HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatAt = now;
    sendHeartbeat();
  }
}
