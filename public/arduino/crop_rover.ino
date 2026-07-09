/*
 * ESP32 ROVER -- main controller board
 * ------------------------------------------------------------------
 *  - Joins YOUR WiFi (STA)  -> serves the control site to your phone
 *  - Runs its OWN hotspot (AP) -> the ESP32-CAM connects here
 *  - Relays the ESP32-CAM video onto the site (proxy, runs on core 0)
 *  - NEO-7M GPS on Serial2
 *  - 2x HC-SR04 ultrasonic (front + back) -> auto-steer away from obstacles
 *  - 2 DC motors (L298N) + servo   (same wiring/behaviour as before)
 *
 *  Libraries needed (Tools -> Manage Libraries):
 *    - ESP32Servo
 *    - TinyGPSPlus   (by Mikal Hart)
 *
 *  How viewing works:
 *    Phone on your home WiFi -> open the IP printed in Serial Monitor.
 *    The <img> on the page loads http://<that-ip>:81/ , which this board
 *    relays from the cam at 192.168.4.2. So you never touch the hotspot.
 * ------------------------------------------------------------------
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>
#include <TinyGPS++.h>

// ================= WiFi =================
// Your home WiFi (the site is served here)
const char* WIFI_SSID     = "Nexus";
const char* WIFI_PASSWORD = "Mineaxecraft321";

// The rover's own hotspot (the ESP32-CAM joins THIS). Use these same
// values in the ESP32-CAM sketch. Password must be >= 8 characters.
const char* AP_SSID = "RoverCam";
const char* AP_PASS = "rover12345";

// Where the cam lives on the hotspot (must match the cam's static IP)
IPAddress    CAM_IP(192, 168, 4, 2);
const uint16_t CAM_PORT = 81;

// ================= Pins =================
#define ENA 25
#define IN1 13
#define IN2 12

#define ENB 26
#define IN3 14
#define IN4 27

#define SERVO_PIN 33

// GPS (NEO-7M): GPS TX -> ESP RX(16), GPS RX -> ESP TX(17)
#define GPS_RX 16
#define GPS_TX 17

// Ultrasonic HC-SR04. ECHO pins are input-only (34/35) on purpose.
// IMPORTANT: HC-SR04 ECHO is 5V -> use a divider (e.g. 1k to echo, 2k to GND)
// or a 3.3V "HC-SR04P" module, or you can fry the ESP32 input.
#define FRONT_TRIG 5
#define FRONT_ECHO 34
#define BACK_TRIG  18
#define BACK_ECHO  35

// ================= Tuning =================
const int   AVOID_CM     = 25;   // steer away when an obstacle is within this
const int   CLEAR_MARGIN = 8;    // must open up this much extra before resuming
const unsigned long FAILSAFE_MS   = 600;   // stop if browser goes quiet
const unsigned long SENSOR_PERIOD = 60;    // ms between ultrasonic pings (staggered)

// ================= Objects =================
Servo myServo;
WebServer server(80);
WiFiServer streamServer(81);          // camera relay (handled on core 0)
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

// ================= State =================
int  speedPct   = 100;
int  speedValue = 255;
String currentDirection = "STOP";
unsigned long lastCmdMillis = 0;

bool autoAvoid = true;                // obstacle steering on/off
bool avoiding  = false;              // currently overriding to avoid?

volatile unsigned long fRise = 0, bRise = 0;
volatile long fDurUs = -1, bDurUs = -1;
int  frontCm = -1, backCm = -1;

// ================= Motors (unchanged behaviour) =================
void forward()  { analogWrite(ENA, speedValue); analogWrite(ENB, speedValue);
                  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
                  digitalWrite(IN3, LOW);  digitalWrite(IN4, HIGH); }
void backward() { analogWrite(ENA, speedValue); analogWrite(ENB, speedValue);
                  digitalWrite(IN1, LOW);  digitalWrite(IN2, HIGH);
                  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW); }
void left()     { analogWrite(ENA, speedValue); analogWrite(ENB, speedValue);
                  digitalWrite(IN1, LOW);  digitalWrite(IN2, HIGH);
                  digitalWrite(IN3, LOW);  digitalWrite(IN4, HIGH); }
void right()    { analogWrite(ENA, speedValue); analogWrite(ENB, speedValue);
                  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
                  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW); }
void stopBot()  { analogWrite(ENA, 0); analogWrite(ENB, 0);
                  digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
                  digitalWrite(IN3, LOW); digitalWrite(IN4, LOW); }

void servoAction() {
  myServo.write(90); delay(250);
  myServo.write(0);  delay(250);
  myServo.write(90); delay(250);
  myServo.write(0);  delay(250);
}

// ================= Ultrasonic (interrupt based, non-blocking) =================
void IRAM_ATTR fEchoISR() {
  if (digitalRead(FRONT_ECHO)) fRise = micros();
  else if (fRise) { fDurUs = (long)(micros() - fRise); fRise = 0; }
}
void IRAM_ATTR bEchoISR() {
  if (digitalRead(BACK_ECHO)) bRise = micros();
  else if (bRise) { bDurUs = (long)(micros() - bRise); bRise = 0; }
}

void ping(int trigPin) {
  digitalWrite(trigPin, LOW);  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH); delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
}

int usToCm(long us) {
  if (us <= 0 || us > 25000) return -1;   // out of range / no echo
  return (int)(us / 58);
}

void updateSensors() {
  static unsigned long last = 0;
  static bool doFront = true;
  frontCm = usToCm(fDurUs);
  backCm  = usToCm(bDurUs);
  if (millis() - last >= SENSOR_PERIOD) {   // stagger front/back pings
    last = millis();
    if (doFront) ping(FRONT_TRIG); else ping(BACK_TRIG);
    doFront = !doFront;
  }
}

// ================= Drive decision (runs every loop) =================
void driveUpdate() {
  // Failsafe: browser went quiet -> stop
  if (currentDirection != "STOP" && millis() - lastCmdMillis > FAILSAFE_MS) {
    currentDirection = "STOP";
  }

  String act = currentDirection;
  avoiding = false;

  if (autoAvoid) {
    static bool latchF = false, latchB = false;
    // FRONT guards forward motion -> steer away (pivot)
    if (currentDirection == "FORWARD") {
      if (frontCm >= 0 && frontCm <= AVOID_CM)             latchF = true;
      else if (frontCm < 0 || frontCm > AVOID_CM + CLEAR_MARGIN) latchF = false;
      if (latchF) { act = "AVOID"; avoiding = true; }
    } else latchF = false;
    // BACK guards reverse motion -> halt (turning in place doesn't help here)
    if (currentDirection == "BACKWARD") {
      if (backCm >= 0 && backCm <= AVOID_CM)              latchB = true;
      else if (backCm < 0 || backCm > AVOID_CM + CLEAR_MARGIN)   latchB = false;
      if (latchB) { act = "STOP"; avoiding = true; }
    } else latchB = false;
  }

  static String lastAct = "";
  static int    lastSpd = -1;
  if (act != lastAct || speedValue != lastSpd) {   // only actuate on change
    lastAct = act; lastSpd = speedValue;
    if      (act == "FORWARD")  forward();
    else if (act == "BACKWARD") backward();
    else if (act == "LEFT")     left();
    else if (act == "RIGHT")    right();
    else if (act == "AVOID")    right();   // pivot away from the front obstacle
    else                        stopBot();
  }
}

// ================= Camera relay (core 0) =================
// Accepts the browser on :81 and pipes the cam's MJPEG stream straight
// through. Runs in its own task so streaming never stalls driving.
void streamProxyTask(void*) {
  static uint8_t buf[1460];
  streamServer.begin();
  streamServer.setNoDelay(true);
  for (;;) {
    WiFiClient browser = streamServer.available();
    if (browser) {
      unsigned long t = millis();                     // drain the browser's request
      while (browser.connected() && browser.available() == 0 && millis() - t < 200) vTaskDelay(1);
      while (browser.available()) browser.read();

      WiFiClient cam;
      if (cam.connect(CAM_IP, CAM_PORT, 2000)) {
        cam.print("GET /stream HTTP/1.1\r\nHost: rovercam\r\nConnection: keep-alive\r\n\r\n");
        while (browser.connected() && cam.connected()) {
          int n = cam.available();
          if (n > 0) {
            if (n > (int)sizeof(buf)) n = sizeof(buf);
            n = cam.read(buf, n);
            int w = 0;
            while (w < n && browser.connected()) w += browser.write(buf + w, n - w);
          } else vTaskDelay(1);
        }
        cam.stop();
      } else {
        browser.print("HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain\r\n"
                      "Connection: close\r\n\r\nCamera offline");
      }
      browser.stop();
    }
    vTaskDelay(5);
  }
}

// ================= Web UI =================
const char INDEX_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ESP32 Rover</title></head>
<body>
<h2>ESP32 Rover</h2>
<p>Use /cmd?c=forward,75 | backward,50 | left,60 | right,60 | stop | servo | gps | avoid,on|off | speed,75</p>
<p>Camera stream: <a href=":81/">:81/</a> · Status: <a href="/status">/status</a></p>
</body></html>
)rawliteral";

// ================= HTTP handlers =================
void handleRoot() { server.send(200, "text/html", INDEX_HTML); }

void handleCmd() {
  if (!server.hasArg("c")) { server.send(400, "text/plain", "ERROR: missing param"); return; }
  String c = server.arg("c"); c.trim();
  String lc = c; lc.toLowerCase();

  if (lc == "stop")  { currentDirection = "STOP"; lastCmdMillis = millis(); server.send(200,"text/plain","OK:stop"); return; }
  if (lc == "servo") { servoAction(); server.send(200,"text/plain","OK:servo"); return; }
  if (lc == "gps")   {
    server.send(200,"text/plain", gps.location.isValid()
      ? "GPS:"+String(gps.location.lat(),6)+","+String(gps.location.lng(),6) : "GPS:No Fix");
    return;
  }

  int comma = c.indexOf(',');
  if (comma == -1) { server.send(400,"text/plain","ERROR: bad format"); return; }
  String dir = c.substring(0,comma); dir.trim(); dir.toLowerCase();
  String val = c.substring(comma+1); val.trim();
  String vlc = val; vlc.toLowerCase();

  if (dir == "avoid") {
    autoAvoid = (vlc == "on" || vlc == "1" || vlc == "true");
    server.send(200,"text/plain","OK:avoid,"+String(autoAvoid?"on":"off"));
    return;
  }
  if (dir == "speed") {
    speedPct = constrain(val.toInt(),0,100); speedValue = map(speedPct,0,100,0,255);
    lastCmdMillis = millis(); server.send(200,"text/plain","OK:speed,"+String(speedPct)); return;
  }
  if (dir == "stop") { currentDirection="STOP"; lastCmdMillis=millis(); server.send(200,"text/plain","OK:stop"); return; }

  speedPct = constrain(val.toInt(),0,100); speedValue = map(speedPct,0,100,0,255);
  lastCmdMillis = millis();

  if      (dir=="forward")  currentDirection="FORWARD";
  else if (dir=="backward") currentDirection="BACKWARD";
  else if (dir=="left")     currentDirection="LEFT";
  else if (dir=="right")    currentDirection="RIGHT";
  else { server.send(400,"text/plain","ERROR: unknown command"); return; }

  server.send(200,"text/plain","OK:"+dir+","+String(speedPct));
}

void handleStatus() {
  String j = "{";
  j += "\"direction\":\"" + currentDirection + "\",";
  j += "\"speed\":" + String(speedPct) + ",";
  j += "\"avoid\":" + String(autoAvoid ? "true":"false") + ",";
  j += "\"avoiding\":" + String(avoiding ? "true":"false") + ",";
  j += "\"front\":" + String(frontCm) + ",";
  j += "\"back\":" + String(backCm) + ",";
  j += "\"gps_valid\":" + String(gps.location.isValid() ? "true":"false") + ",";
  if (gps.location.isValid()) {
    j += "\"lat\":" + String(gps.location.lat(),6) + ",";
    j += "\"lng\":" + String(gps.location.lng(),6) + ",";
    j += "\"satellites\":" + String(gps.satellites.value());
  } else {
    j += "\"lat\":0,\"lng\":0,\"satellites\":0";
  }
  j += "}";
  server.send(200,"application/json",j);
}

// ================= Setup / loop =================
void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

  pinMode(ENA,OUTPUT); pinMode(ENB,OUTPUT);
  pinMode(IN1,OUTPUT); pinMode(IN2,OUTPUT);
  pinMode(IN3,OUTPUT); pinMode(IN4,OUTPUT);

  pinMode(FRONT_TRIG,OUTPUT); pinMode(FRONT_ECHO,INPUT);
  pinMode(BACK_TRIG, OUTPUT); pinMode(BACK_ECHO, INPUT);
  attachInterrupt(digitalPinToInterrupt(FRONT_ECHO), fEchoISR, CHANGE);
  attachInterrupt(digitalPinToInterrupt(BACK_ECHO),  bEchoISR, CHANGE);

  myServo.attach(SERVO_PIN);
  myServo.write(0);
  stopBot();

  // AP + STA at the same time: hotspot for the cam, home WiFi for the site.
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.print("Hotspot for cam: \""); Serial.print(AP_SSID);
  Serial.print("\"  ("); Serial.print(WiFi.softAPIP()); Serial.println(")");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("Connecting to %s", WIFI_SSID);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println();
  Serial.print(">>> Open the site at:  http://"); Serial.println(WiFi.localIP());

  server.on("/",       handleRoot);
  server.on("/cmd",    handleCmd);
  server.on("/status", handleStatus);
  server.begin();

  // Camera relay on its own core so streaming never stalls driving.
  xTaskCreatePinnedToCore(streamProxyTask, "streamProxy", 8192, NULL, 1, NULL, 0);

  Serial.println("Ready.");
  lastCmdMillis = millis();
}

void loop() {
  server.handleClient();
  while (gpsSerial.available()) gps.encode(gpsSerial.read());
  updateSensors();
  driveUpdate();
}
