// ============================================
// CropRover ESP32 — 4WD Wi-Fi Motor + GPS Controller
// Board: ESP32 Dev Module
// Hardware: 2x L298N H-bridges (4 motors) + NEO-6M GPS on UART2 (GPIO 16/17)
//
// Endpoints (port 80):
//   GET /            -> control web UI
//   GET /cmd?c=...   -> forward,75 | backward,50 | left,60 | right,60 |
//                       steer,forward,75,30 | steer,backward,60,70 | stop,0 | gps
//   GET /status      -> JSON {direction, speed, gps_valid, lat, lng, satellites}
// ============================================

#include <TinyGPS++.h>
#include <WiFi.h>
#include <WebServer.h>

// WiFi credentials. Fill these in before uploading.
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Motor pins
const int LEFT_ENABLE_A     = 25;   // ENA front-left  (IN1/IN2)
const int LEFT_ENABLE_B     = 23;   // ENB rear-left   (IN3/IN4)
const int LEFT_IN1          = 27;
const int LEFT_IN2          = 14;
const int LEFT_IN3          = 33;
const int LEFT_IN4          = 32;

const int RIGHT_ENABLE_A    = 26;   // ENA front-right (IN1/IN2)
const int RIGHT_ENABLE_B    = 22;   // ENB rear-right  (IN3/IN4)
const int RIGHT_IN1         = 12;
const int RIGHT_IN2         = 13;
const int RIGHT_IN3         = 18;
const int RIGHT_IN4         = 19;

const int LEFT_PWM_A        = 0;
const int LEFT_PWM_B        = 2;
const int RIGHT_PWM_A       = 1;
const int RIGHT_PWM_B       = 3;
const int PWM_FREQ          = 5000;
const int PWM_RESOLUTION    = 8;

// Flip one of these if a side spins opposite of the other during a forward test.
const bool INVERT_LEFT_SIDE  = false;
const bool INVERT_RIGHT_SIDE = false;

// GPS
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

// Web server
WebServer server(80);

// State
unsigned long lastGPSTime = 0;
String currentDirection   = "STOP";
int    currentSpeed       = 0;

struct MotorSide {
  int in1, in2, pwmA;
  int in3, in4, pwmB;
  bool inverted;

  void set(int speed) {
    if (inverted) speed = -speed;
    if (speed == 0) { stop(); return; }

    bool forward = speed > 0;
    int  pwm     = constrain(abs(speed), 0, 255);

    digitalWrite(in1, forward ? HIGH : LOW);
    digitalWrite(in2, forward ? LOW  : HIGH);
    ledcWrite(pwmA, pwm);

    digitalWrite(in3, forward ? HIGH : LOW);
    digitalWrite(in4, forward ? LOW  : HIGH);
    ledcWrite(pwmB, pwm);
  }

  void stop() {
    digitalWrite(in1, LOW); digitalWrite(in2, LOW); ledcWrite(pwmA, 0);
    digitalWrite(in3, LOW); digitalWrite(in4, LOW); ledcWrite(pwmB, 0);
  }
};

MotorSide leftSide  = {LEFT_IN1,  LEFT_IN2,  LEFT_PWM_A,
                       LEFT_IN3,  LEFT_IN4,  LEFT_PWM_B, INVERT_LEFT_SIDE};
MotorSide rightSide = {RIGHT_IN1, RIGHT_IN2, RIGHT_PWM_A,
                       RIGHT_IN3, RIGHT_IN4, RIGHT_PWM_B, INVERT_RIGHT_SIDE};

void moveForward(int pwm)  { leftSide.set(pwm);   rightSide.set(pwm);   }
void moveBackward(int pwm) { leftSide.set(-pwm);  rightSide.set(-pwm);  }
void pivotLeft(int pwm)    { leftSide.set(-pwm);  rightSide.set(pwm);   }
void pivotRight(int pwm)   { leftSide.set(pwm);   rightSide.set(-pwm);  }
void stopMotors()          { leftSide.stop();     rightSide.stop();     }

void steerDrive(int pwm, int bias, bool reverse) {
  // bias 0-100: 0=left arc, 50=straight, 100=right arc.
  float b = (bias - 50) / 50.0f;
  int   l = (int)(pwm * (b >= 0 ? 1.0f : 1.0f + b));
  int   r = (int)(pwm * (b <= 0 ? 1.0f : 1.0f - b));

  if (reverse) { l = -l; r = -r; }

  leftSide.set(l);
  rightSide.set(r);
}

void handleRoot() {
  server.send(200, "text/html",
    "<h2>ESP32 Rover</h2>"
    "<p>Use /cmd?c=forward,75 | backward,50 | left,60 | right,60 | "
    "steer,forward,75,30 | stop,0 | gps</p>"
    "<p>Status: <a href='/status'>/status</a></p>");
}

void handleCmd() {
  if (!server.hasArg("c")) { server.send(400, "text/plain", "ERROR: missing param"); return; }

  String command = server.arg("c"); command.trim();

  if (command.equalsIgnoreCase("gps")) {
    server.send(200, "text/plain", gps.location.isValid()
      ? "GPS:" + String(gps.location.lat(), 6) + "," + String(gps.location.lng(), 6)
      : "GPS:No Fix");
    return;
  }

  int c1 = command.indexOf(',');
  if (c1 == -1) { server.send(400, "text/plain", "ERROR: bad format"); return; }

  String dir = command.substring(0, c1); dir.trim(); dir.toLowerCase();
  String rest = command.substring(c1 + 1); rest.trim();

  if (dir == "stop") {
    stopMotors();
    currentDirection = "STOP"; currentSpeed = 0;
    server.send(200, "text/plain", "OK:stop");
    Serial.println("[CMD] stop");
    return;
  }

  if (dir == "steer") {
    String mode = "forward"; int speed = 0; int bias = 50;

    int c2 = rest.indexOf(',');
    String firstToken = (c2 == -1) ? rest : rest.substring(0, c2);
    firstToken.trim(); firstToken.toLowerCase();

    if (firstToken == "forward" || firstToken == "backward") {
      mode = firstToken;
      String remaining = (c2 == -1) ? "" : rest.substring(c2 + 1); remaining.trim();

      int c3 = remaining.indexOf(',');
      String speedPart = (c3 == -1) ? remaining : remaining.substring(0, c3);
      speedPart.trim();
      speed = constrain(speedPart.toInt(), 0, 100);

      if (c3 != -1) {
        String biasPart = remaining.substring(c3 + 1); biasPart.trim();
        bias = constrain(biasPart.toInt(), 0, 100);
      }
    } else {
      speed = constrain(firstToken.toInt(), 0, 100);
      if (c2 != -1) {
        String biasPart = rest.substring(c2 + 1); biasPart.trim();
        bias = constrain(biasPart.toInt(), 0, 100);
      }
    }

    int pwm = (speed == 0) ? 0 : map(speed, 0, 100, 50, 255);
    bool reverse = (mode == "backward");
    steerDrive(pwm, bias, reverse);

    if (reverse) {
      currentDirection = (bias < 45) ? "BACK-L" : (bias > 55) ? "BACK-R" : "BACKWARD";
    } else {
      currentDirection = (bias < 45) ? "STEER-L" : (bias > 55) ? "STEER-R" : "FORWARD";
    }
    currentSpeed = speed;

    server.send(200, "text/plain", "OK:steer," + mode + "," + String(speed) + "," + String(bias));
    Serial.printf("[CMD] steer mode=%s spd=%d bias=%d\n", mode.c_str(), speed, bias);
    return;
  }

  int speed = constrain(rest.toInt(), 0, 100);
  int pwm = (speed == 0) ? 0 : map(speed, 0, 100, 50, 255);

  if      (dir == "forward")  { moveForward(pwm);  currentDirection = "FORWARD";  }
  else if (dir == "backward") { moveBackward(pwm); currentDirection = "BACKWARD"; }
  else if (dir == "left")     { pivotLeft(pwm);    currentDirection = "PIVOT-L";  }
  else if (dir == "right")    { pivotRight(pwm);   currentDirection = "PIVOT-R";  }
  else { server.send(400, "text/plain", "ERROR: unknown command"); return; }

  currentSpeed = speed;
  server.send(200, "text/plain", "OK:" + dir + "," + String(speed));
  Serial.printf("[CMD] %s @ %d%%\n", dir.c_str(), speed);
}

void handleStatus() {
  String json = "{";
  json += "\"direction\":\"" + currentDirection + "\",";
  json += "\"speed\":" + String(currentSpeed) + ",";
  json += "\"gps_valid\":" + String(gps.location.isValid() ? "true" : "false") + ",";
  if (gps.location.isValid()) {
    json += "\"lat\":" + String(gps.location.lat(), 6) + ",";
    json += "\"lng\":" + String(gps.location.lng(), 6) + ",";
    json += "\"satellites\":" + String(gps.satellites.value());
  } else {
    json += "\"lat\":0,\"lng\":0,\"satellites\":0";
  }
  json += "}";
  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);

  int pins[] = {
    LEFT_IN1, LEFT_IN2, LEFT_IN3, LEFT_IN4,
    RIGHT_IN1, RIGHT_IN2, RIGHT_IN3, RIGHT_IN4
  };
  for (int p : pins) pinMode(p, OUTPUT);

  ledcSetup(LEFT_PWM_A,  PWM_FREQ, PWM_RESOLUTION); ledcAttachPin(LEFT_ENABLE_A,  LEFT_PWM_A);
  ledcSetup(LEFT_PWM_B,  PWM_FREQ, PWM_RESOLUTION); ledcAttachPin(LEFT_ENABLE_B,  LEFT_PWM_B);
  ledcSetup(RIGHT_PWM_A, PWM_FREQ, PWM_RESOLUTION); ledcAttachPin(RIGHT_ENABLE_A, RIGHT_PWM_A);
  ledcSetup(RIGHT_PWM_B, PWM_FREQ, PWM_RESOLUTION); ledcAttachPin(RIGHT_ENABLE_B, RIGHT_PWM_B);

  stopMotors();

  Serial.printf("Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi connected!");
  Serial.print("Open: http://");
  Serial.println(WiFi.localIP());

  server.on("/",       handleRoot);
  server.on("/cmd",    handleCmd);
  server.on("/status", handleStatus);
  server.begin();
  Serial.println("Web server started.");
}

void loop() {
  server.handleClient();
  while (gpsSerial.available()) gps.encode(gpsSerial.read());

  if (millis() - lastGPSTime > 2000) {
    lastGPSTime = millis();
    if (gps.location.isValid()) {
      Serial.printf("[GPS] %.6f, %.6f\n", gps.location.lat(), gps.location.lng());
    }
  }
}
