// ============================================
// CropRover ESP32 — Wi-Fi Motor + GPS Controller
// Board: ESP32 Dev Module
// Hardware: L298N H-bridge + NEO-6M GPS (UART2 on GPIO16/17)
//
// Endpoints (port 80):
//   GET /            -> control web UI
//   GET /cmd?c=...   -> e.g. forward,75 | backward,50 | left,60 | right,60 | stop,0 | gps
//   GET /status      -> JSON {direction, speed, gps_valid, lat, lng, satellites}
// ============================================

#include <TinyGPS++.h>
#include <WiFi.h>
#include <WebServer.h>

// ─── WiFi Credentials ────────────────────────────────────────────────────────
const char* WIFI_SSID     = "Nexus";
const char* WIFI_PASSWORD = "Mineaxecraft21";

// ─── Motor Pins ──────────────────────────────────────────────────────────────
const int LEFT_ENABLE       = 25;
const int RIGHT_ENABLE      = 26;
const int LEFT_IN1          = 27;
const int LEFT_IN2          = 14;
const int RIGHT_IN1         = 12;
const int RIGHT_IN2         = 13;
const int LEFT_PWM_CHANNEL  = 0;
const int RIGHT_PWM_CHANNEL = 1;
const int PWM_FREQ          = 5000;
const int PWM_RESOLUTION    = 8;

// ─── GPS ─────────────────────────────────────────────────────────────────────
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

// ─── Web Server ──────────────────────────────────────────────────────────────
WebServer server(80);

// ─── State ───────────────────────────────────────────────────────────────────
unsigned long lastGPSTime = 0;
String currentDirection   = "stop";
int    currentSpeed       = 0;

// ─── Motor struct ────────────────────────────────────────────────────────────
struct Motor {
  int in1, in2, pwmChannel;
  void setDirection(bool forward, int speed) {
    if (speed == 0) {
      digitalWrite(in1, LOW); digitalWrite(in2, LOW);
      ledcWrite(pwmChannel, 0); return;
    }
    digitalWrite(in1, forward ? HIGH : LOW);
    digitalWrite(in2, forward ? LOW  : HIGH);
    ledcWrite(pwmChannel, speed);
  }
};

Motor leftMotor  = {LEFT_IN1,  LEFT_IN2,  LEFT_PWM_CHANNEL};
Motor rightMotor = {RIGHT_IN1, RIGHT_IN2, RIGHT_PWM_CHANNEL};

// ─── Motor control ───────────────────────────────────────────────────────────
void moveForward(int s)  { leftMotor.setDirection(true,  s); rightMotor.setDirection(true,  s); }
void moveBackward(int s) { leftMotor.setDirection(false, s); rightMotor.setDirection(false, s); }
void turnLeft(int s)     { leftMotor.setDirection(false, s); rightMotor.setDirection(true,  s); }
void turnRight(int s)    { leftMotor.setDirection(true,  s); rightMotor.setDirection(false, s); }
void stopMotors()        { leftMotor.setDirection(true,  0); rightMotor.setDirection(true,  0); }

// ─── HTML Page ───────────────────────────────────────────────────────────────
const char INDEX_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ESP32 Rover Control</title>
<style>
  :root {
    --bg:#0a0a0f; --panel:#10101a; --border:#1e2040;
    --accent:#00f5a0; --accent2:#00d4ff; --danger:#ff3860;
    --text:#c8d0e8; --dim:#4a5080;
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--bg); color:var(--text); font-family:monospace;
    min-height:100vh; display:flex; flex-direction:column; align-items:center; padding:24px 16px; }
  header { text-align:center; margin-bottom:24px; }
  header h1 { font-size:1.4rem; letter-spacing:0.15em; color:var(--accent); }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; width:100%; max-width:520px; }
  .card { background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:20px; }
  .card.full { grid-column:1/-1; }
  .card-label { font-size:0.7rem; letter-spacing:0.25em; color:var(--dim); text-transform:uppercase; margin-bottom:14px; }
  .dpad { display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(3,1fr); gap:8px; aspect-ratio:1; }
  .dpad-btn { background:#15152a; border:1px solid var(--border); border-radius:8px;
    color:var(--text); font-size:1.2rem; cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .dpad-btn:active { transform:scale(0.93); }
  .dpad-btn.up{grid-column:2;grid-row:1;} .dpad-btn.left{grid-column:1;grid-row:2;}
  .dpad-btn.stop{grid-column:2;grid-row:2;color:var(--danger);font-size:0.65rem;}
  .dpad-btn.right{grid-column:3;grid-row:2;} .dpad-btn.down{grid-column:2;grid-row:3;}
  .speed-value { font-size:2rem; color:var(--accent); text-align:center; margin-bottom:12px; }
  input[type=range] { width:100%; }
  .status-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border); font-size:0.8rem; }
  .status-row:last-child{border:none;} .status-key{color:var(--dim);} .status-val{color:var(--accent2);}
  .cmd-input { width:100%; background:#15152a; border:1px solid var(--border); border-radius:8px;
    color:var(--text); font-family:monospace; padding:10px; outline:none; margin-bottom:8px; }
  .send-btn { width:100%; background:var(--accent); border:none; border-radius:8px;
    color:#000; font-weight:700; padding:10px; cursor:pointer; }
</style>
</head>
<body>
<header><h1>ESP32 ROVER CONTROL</h1></header>
<div class="grid">
  <div class="card">
    <div class="card-label">Direction</div>
    <div class="dpad">
      <button class="dpad-btn up"    onclick="send('forward')">▲</button>
      <button class="dpad-btn left"  onclick="send('left')">◀</button>
      <button class="dpad-btn stop"  onclick="send('stop')">STOP</button>
      <button class="dpad-btn right" onclick="send('right')">▶</button>
      <button class="dpad-btn down"  onclick="send('backward')">▼</button>
    </div>
  </div>
  <div class="card">
    <div class="card-label">Speed</div>
    <div class="speed-value" id="spd">75%</div>
    <input type="range" min="0" max="100" value="75" id="sp" oninput="document.getElementById('spd').innerText=this.value+'%'">
  </div>
  <div class="card full">
    <div class="card-label">Status</div>
    <div class="status-row"><span class="status-key">DIRECTION</span><span class="status-val" id="dir">STOP</span></div>
    <div class="status-row"><span class="status-key">SPEED</span><span class="status-val" id="cs">0%</span></div>
    <div class="status-row"><span class="status-key">GPS</span><span class="status-val" id="gps">--</span></div>
    <div class="status-row"><span class="status-key">SATELLITES</span><span class="status-val" id="sat">--</span></div>
  </div>
  <div class="card full">
    <div class="card-label">Manual Command</div>
    <input class="cmd-input" id="cmd" placeholder="e.g. forward,80">
    <button class="send-btn" onclick="raw()">SEND</button>
  </div>
</div>
<script>
function send(dir){
  var s=document.getElementById('sp').value;
  fetch('/cmd?c='+dir+','+(dir==='stop'?0:s));
}
function raw(){ fetch('/cmd?c='+encodeURIComponent(document.getElementById('cmd').value)); }
setInterval(function(){
  fetch('/status').then(r=>r.json()).then(j=>{
    document.getElementById('dir').innerText=j.direction;
    document.getElementById('cs').innerText=j.speed+'%';
    document.getElementById('gps').innerText=j.gps_valid?(j.lat.toFixed(5)+','+j.lng.toFixed(5)):'No Fix';
    document.getElementById('sat').innerText=j.satellites;
  });
}, 1500);
</script>
</body>
</html>
)rawliteral";

// ─── Route handlers ──────────────────────────────────────────────────────────
void handleRoot() { server.send_P(200, "text/html", INDEX_HTML); }

void handleCmd() {
  if (!server.hasArg("c")) { server.send(400, "text/plain", "ERROR: missing param"); return; }
  String command = server.arg("c");
  command.trim();

  if (command.equalsIgnoreCase("gps")) {
    if (gps.location.isValid()) {
      server.send(200, "text/plain",
        "GPS:" + String(gps.location.lat(), 6) + "," + String(gps.location.lng(), 6));
    } else {
      server.send(200, "text/plain", "GPS:No Fix");
    }
    return;
  }

  int commaIndex = command.indexOf(',');
  if (commaIndex == -1) { server.send(400, "text/plain", "ERROR: format is direction,speed"); return; }

  String direction = command.substring(0, commaIndex);
  direction.toLowerCase();
  int speed    = command.substring(commaIndex + 1).toInt();
  speed        = constrain(speed, 0, 100);
  int pwmSpeed = (speed == 0) ? 0 : map(speed, 0, 100, 50, 255);

  if      (direction == "forward")  { moveForward(pwmSpeed);  currentDirection = "FORWARD";  }
  else if (direction == "backward") { moveBackward(pwmSpeed); currentDirection = "BACKWARD"; }
  else if (direction == "left")     { turnLeft(pwmSpeed);     currentDirection = "LEFT";     }
  else if (direction == "right")    { turnRight(pwmSpeed);    currentDirection = "RIGHT";    }
  else if (direction == "stop")     { stopMotors();           currentDirection = "STOP"; speed = 0; }
  else { server.send(400, "text/plain", "ERROR: unknown direction"); return; }

  currentSpeed = speed;
  server.send(200, "text/plain", "OK:" + direction + "," + String(speed));
  Serial.printf("[CMD] %s @ %d%%\n", direction.c_str(), speed);
}

void handleStatus() {
  String json = "{";
  json += "\"direction\":\"" + currentDirection + "\",";
  json += "\"speed\":"       + String(currentSpeed) + ",";
  json += "\"gps_valid\":"   + String(gps.location.isValid() ? "true" : "false") + ",";
  if (gps.location.isValid()) {
    json += "\"lat\":"        + String(gps.location.lat(), 6) + ",";
    json += "\"lng\":"        + String(gps.location.lng(), 6) + ",";
    json += "\"satellites\":" + String(gps.satellites.value());
  } else {
    json += "\"lat\":0,\"lng\":0,\"satellites\":0";
  }
  json += "}";
  server.send(200, "application/json", json);
}

// ─── Setup ───────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);

  pinMode(LEFT_IN1,  OUTPUT); pinMode(LEFT_IN2,  OUTPUT);
  pinMode(RIGHT_IN1, OUTPUT); pinMode(RIGHT_IN2, OUTPUT);
  ledcSetup(LEFT_PWM_CHANNEL,  PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(LEFT_ENABLE,  LEFT_PWM_CHANNEL);
  ledcSetup(RIGHT_PWM_CHANNEL, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(RIGHT_ENABLE, RIGHT_PWM_CHANNEL);
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

// ─── Loop ────────────────────────────────────────────────────────────────────
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
