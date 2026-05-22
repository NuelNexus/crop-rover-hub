// ============================================
// ESP32 CropRover Bot
// Device Type: crop_rover (ESP32 + L298N)
// Receives HTTP commands and drives motors
// ============================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <WebServer.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

const char* supabaseUrl = "https://ejaiyndbvvqnnvmdunkh.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqYWl5bmRidnZxbm52bWR1bmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDkwNjEsImV4cCI6MjA5MDc4NTA2MX0.Q5JbIjfOZhdcupy2sHZDb-Qw0wl70k7P48F62IGXFS4";
const char* deviceId = "0ea0088c-86ff-4b55-9bc1-201660e2da2e";
const char* deviceKey = "18712ac9-71bc-4aff-8e84-80271c8e1724";

// Static IP (edit if your LAN differs)
IPAddress local_IP(192, 168, 1, 90);
IPAddress gateway(192, 168, 1, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress dns(1, 1, 1, 1);

// L298N motor pins (edit as needed)
static const uint8_t LEFT_IN1 = 12;
static const uint8_t LEFT_IN2 = 13;
static const uint8_t LEFT_ENABLE = 25;

static const uint8_t RIGHT_IN1 = 14;
static const uint8_t RIGHT_IN2 = 27;
static const uint8_t RIGHT_ENABLE = 26;

static const uint8_t LEFT_PWM_CHANNEL = 0;
static const uint8_t RIGHT_PWM_CHANNEL = 1;
static const uint32_t PWM_FREQ = 1000;
static const uint8_t PWM_RESOLUTION = 8;

WebServer server(80);

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

String readBody() {
  if (!server.hasArg("plain")) return "";
  return server.arg("plain");
}

String extractJsonField(const String& body, const String& key) {
  int keyIndex = body.indexOf(String("\"") + key + "\"");
  if (keyIndex < 0) return "";
  int colon = body.indexOf(':', keyIndex);
  if (colon < 0) return "";
  int start = colon + 1;
  while (start < body.length() && (body[start] == ' ' || body[start] == '"')) start++;
  int end = start;
  while (end < body.length() && body[end] != '"' && body[end] != ',' && body[end] != '}') end++;
  return body.substring(start, end);
}

void setMotor(uint8_t in1, uint8_t in2, uint8_t channel, bool forward, uint8_t speed) {
  if (speed == 0) {
    digitalWrite(in1, LOW);
    digitalWrite(in2, LOW);
    ledcWrite(channel, 0);
    return;
  }
  digitalWrite(in1, forward ? HIGH : LOW);
  digitalWrite(in2, forward ? LOW : HIGH);
  ledcWrite(channel, speed);
}

void moveForward(uint8_t speed) {
  setMotor(LEFT_IN1, LEFT_IN2, LEFT_PWM_CHANNEL, true, speed);
  setMotor(RIGHT_IN1, RIGHT_IN2, RIGHT_PWM_CHANNEL, true, speed);
}

void moveBackward(uint8_t speed) {
  setMotor(LEFT_IN1, LEFT_IN2, LEFT_PWM_CHANNEL, false, speed);
  setMotor(RIGHT_IN1, RIGHT_IN2, RIGHT_PWM_CHANNEL, false, speed);
}

void turnLeft(uint8_t speed) {
  setMotor(LEFT_IN1, LEFT_IN2, LEFT_PWM_CHANNEL, false, speed);
  setMotor(RIGHT_IN1, RIGHT_IN2, RIGHT_PWM_CHANNEL, true, speed);
}

void turnRight(uint8_t speed) {
  setMotor(LEFT_IN1, LEFT_IN2, LEFT_PWM_CHANNEL, true, speed);
  setMotor(RIGHT_IN1, RIGHT_IN2, RIGHT_PWM_CHANNEL, false, speed);
}

void stopMotors() {
  setMotor(LEFT_IN1, LEFT_IN2, LEFT_PWM_CHANNEL, true, 0);
  setMotor(RIGHT_IN1, RIGHT_IN2, RIGHT_PWM_CHANNEL, true, 0);
}

void handleDrive() {
  String body = readBody();
  String direction = extractJsonField(body, "direction");
  String speedStr = extractJsonField(body, "speed");

  if (direction.length() == 0) {
    server.send(400, "application/json", "{\"error\":\"missing direction\"}");
    return;
  }

  int speed = speedStr.toInt();
  speed = constrain(speed, 0, 100);
  uint8_t pwmSpeed = map(speed, 0, 100, 0, 255);

  if (direction == "forward") moveForward(pwmSpeed);
  else if (direction == "backward") moveBackward(pwmSpeed);
  else if (direction == "left") turnLeft(pwmSpeed);
  else if (direction == "right") turnRight(pwmSpeed);
  else if (direction == "stop") stopMotors();
  else stopMotors();

  server.send(200, "application/json", "{\"ok\":true}");
}

void setup() {
  Serial.begin(115200);

  pinMode(LEFT_IN1, OUTPUT);
  pinMode(LEFT_IN2, OUTPUT);
  pinMode(RIGHT_IN1, OUTPUT);
  pinMode(RIGHT_IN2, OUTPUT);

  ledcSetup(LEFT_PWM_CHANNEL, PWM_FREQ, PWM_RESOLUTION);
  ledcSetup(RIGHT_PWM_CHANNEL, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(LEFT_ENABLE, LEFT_PWM_CHANNEL);
  ledcAttachPin(RIGHT_ENABLE, RIGHT_PWM_CHANNEL);

  stopMotors();

  if (!WiFi.config(local_IP, gateway, subnet, dns)) {
    Serial.println("Static IP config failed");
  }
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.print("\nIP: "); Serial.println(WiFi.localIP());

  server.on("/drive", HTTP_POST, handleDrive);
  server.begin();

  sendHeartbeat();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) { WiFi.reconnect(); delay(1000); }
  server.handleClient();
  sendHeartbeat();
  delay(5000);
}
