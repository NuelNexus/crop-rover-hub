// ============================================
// CropRover Movement Controller
// Board: Arduino Nano (ATmega328P)
// Hardware: L298N H-bridge + NEO-6M GPS (SoftwareSerial 2/3)
// Pairs with the ESP32-CAM for vision; this Nano handles motors + GPS.
//
// Serial commands (9600 baud, newline terminated):
//   forward,<0-100>
//   backward,<0-100>
//   left,<0-100>
//   right,<0-100>
//   stop,0
// Emits "GPS_PERIODIC: <lat>,<lng>" every 2s when fix is valid.
// ============================================

#include <SoftwareSerial.h>
#include <TinyGPS++.h>
#include <Wire.h>

// Motor pin definitions
const uint8_t RIGHT_ENABLE = 9;
const uint8_t LEFT_ENABLE  = 10;
const uint8_t LEFT_IN1     = 12;
const uint8_t LEFT_IN2     = 11;
const uint8_t LEFT_IN3     = 6;
const uint8_t LEFT_IN4     = 5;
const uint8_t RIGHT_IN1    = 8;
const uint8_t RIGHT_IN2    = 7;
const uint8_t RIGHT_IN3    = 4;
const uint8_t RIGHT_IN4    = 3;

// Motor control struct
struct Motor {
  uint8_t in1;
  uint8_t in2;
  uint8_t in3;
  uint8_t in4;
  uint8_t enable;

  void setDirection(bool forward, uint8_t speed) {
    if (speed == 0) {
      digitalWrite(in1, LOW);
      digitalWrite(in2, LOW);
      digitalWrite(in3, LOW);
      digitalWrite(in4, LOW);
      analogWrite(enable, 0);
      return;
    }

    analogWrite(enable, speed);
    if (forward) {
      digitalWrite(in1, HIGH);
      digitalWrite(in2, LOW);
      digitalWrite(in3, LOW);
      digitalWrite(in4, LOW);
    } else {
      digitalWrite(in1, LOW);
      digitalWrite(in2, LOW);
      digitalWrite(in3, HIGH);
      digitalWrite(in4, LOW);
    }
  }
};

Motor leftMotor  = { LEFT_IN1,  LEFT_IN2,  LEFT_IN3,  LEFT_IN4,  LEFT_ENABLE  };
Motor rightMotor = { RIGHT_IN1, RIGHT_IN2, RIGHT_IN3, RIGHT_IN4, RIGHT_ENABLE };

// GPS via SoftwareSerial (RX=2, TX=3)
SoftwareSerial gpsSerial(2, 3);
TinyGPSPlus gps;

String inputString = "";
bool stringComplete = false;
unsigned long lastGPSTime = 0;

void stopMotors();
void processCommand(String command);
void moveForward(uint8_t speed);
void moveBackward(uint8_t speed);
void turnLeft(uint8_t speed);
void turnRight(uint8_t speed);

void setup() {
  Serial.begin(9600);
  gpsSerial.begin(9600);

  pinMode(leftMotor.in1, OUTPUT);
  pinMode(leftMotor.in2, OUTPUT);
  pinMode(leftMotor.in3, OUTPUT);
  pinMode(leftMotor.in4, OUTPUT);
  pinMode(leftMotor.enable, OUTPUT);
  pinMode(rightMotor.in1, OUTPUT);
  pinMode(rightMotor.in2, OUTPUT);
  pinMode(rightMotor.in3, OUTPUT);
  pinMode(rightMotor.in4, OUTPUT);
  pinMode(rightMotor.enable, OUTPUT);

  Wire.begin();
  stopMotors();

  Serial.println(F("Arduino Nano Motor Controller Ready"));
  Serial.println(F("Commands: forward,speed | backward,speed | left,speed | right,speed | stop,0"));

  inputString.reserve(200);
}

void loop() {
  // Read serial commands
  while (Serial.available()) {
    char inChar = (char)Serial.read();
    inputString += inChar;
    if (inChar == '\n' || inChar == '\r') {
      stringComplete = true;
    }
  }

  if (stringComplete) {
    processCommand(inputString);
    inputString = "";
    stringComplete = false;
  }

  // Feed GPS parser
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }

  // Periodic GPS output
  if (millis() - lastGPSTime > 2000) {
    lastGPSTime = millis();
    if (gps.location.isValid()) {
      Serial.print(F("GPS_PERIODIC: "));
      Serial.print(gps.location.lat(), 6);
      Serial.print(F(","));
      Serial.println(gps.location.lng(), 6);
    } else {
      Serial.println(F("GPS_PERIODIC: No Fix"));
    }
  }

  delay(10);
}

void processCommand(String command) {
  command.trim();
  if (command.length() == 0) return;

  int commaIndex = command.indexOf(',');
  if (commaIndex == -1) {
    Serial.println(F("ERROR: Invalid command format"));
    return;
  }

  String direction = command.substring(0, commaIndex);
  direction.toLowerCase();

  int speed = command.substring(commaIndex + 1).toInt();
  speed = constrain(speed, 0, 100);
  int pwmSpeed = constrain(map(speed, 0, 100, 30, 255), 0, 255);

  Serial.print(F("Command: "));
  Serial.print(direction);
  Serial.print(F(", Speed: "));
  Serial.println(speed);

  if      (direction == "forward")  moveForward(pwmSpeed);
  else if (direction == "backward") moveBackward(pwmSpeed);
  else if (direction == "left")     turnLeft(pwmSpeed);
  else if (direction == "right")    turnRight(pwmSpeed);
  else if (direction == "stop")     stopMotors();
  else {
    Serial.println(F("ERROR: Unknown direction command"));
    stopMotors();
  }
}

void moveForward(uint8_t speed) {
  leftMotor.setDirection(true, speed);
  rightMotor.setDirection(true, speed);
}

void moveBackward(uint8_t speed) {
  leftMotor.setDirection(false, speed);
  rightMotor.setDirection(false, speed);
}

void turnLeft(uint8_t speed) {
  leftMotor.setDirection(false, speed);
  rightMotor.setDirection(true, speed);
}

void turnRight(uint8_t speed) {
  leftMotor.setDirection(true, speed);
  rightMotor.setDirection(false, speed);
}

void stopMotors() {
  leftMotor.setDirection(true, 0);
  rightMotor.setDirection(true, 0);
}
