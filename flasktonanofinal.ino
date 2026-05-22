#include <SoftwareSerial.h>
#include <TinyGPS++.h>
#include <Wire.h>

// Motor pin definitions
const uint8_t RIGHT_ENABLE = 9;
const uint8_t LEFT_ENABLE = 10;

const uint8_t LEFT_IN1 = 12;
const uint8_t LEFT_IN2 = 11;
const uint8_t RIGHT_IN1 = 8;
const uint8_t RIGHT_IN2 = 7;

// Motor control struct
struct Motor {
  uint8_t in1;
  uint8_t in2;
  uint8_t enable;

  void setDirection(bool forward, uint8_t speed) {
    if (speed == 0) {
      digitalWrite(in1, LOW);
      digitalWrite(in2, LOW);
      analogWrite(enable, 0);
      return;
    }
    analogWrite(enable, speed);
    digitalWrite(in1, forward ? HIGH : LOW);
    digitalWrite(in2, forward ? LOW : HIGH);
  }
};

// Create motor instances
Motor leftMotor = { LEFT_IN1, LEFT_IN2, LEFT_ENABLE };
Motor rightMotor = { RIGHT_IN1, RIGHT_IN2, RIGHT_ENABLE };

// GPS via SoftwareSerial
SoftwareSerial gpsSerial(2, 3);
TinyGPSPlus gps;

String inputString = "";
bool stringComplete = false;
unsigned long lastGPSTime = 0;

void setup() {
  Serial.begin(9600);
  gpsSerial.begin(9600);

  pinMode(leftMotor.in1, OUTPUT);
  pinMode(leftMotor.in2, OUTPUT);
  pinMode(leftMotor.enable, OUTPUT);

  pinMode(rightMotor.in1, OUTPUT);
  pinMode(rightMotor.in2, OUTPUT);
  pinMode(rightMotor.enable, OUTPUT);

  Wire.begin();

  stopMotors();

  Serial.println("Arduino Nano Motor Controller Ready");
  Serial.println("Commands: forward,speed | backward,speed | left,speed | right,speed | stop,0");

  inputString.reserve(200);
}

void loop() {
  // Receive serial command
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

  // Read GPS data
  while (gpsSerial.available()) {
    char c = gpsSerial.read();
    gps.encode(c);
  }

  // Periodic GPS output
  if (millis() - lastGPSTime > 2000) {
    lastGPSTime = millis();

    if (gps.location.isValid()) {
      Serial.print("GPS_PERIODIC: ");
      Serial.print(gps.location.lat(), 6);
      Serial.print(",");
      Serial.println(gps.location.lng(), 6);
    } else {
      Serial.println("GPS_PERIODIC: No Fix");
    }
  }

  delay(10);
}

void processCommand(String command) {
  command.trim();
  int commaIndex = command.indexOf(',');
  if (commaIndex == -1) {
    Serial.println("ERROR: Invalid command format");
    return;
  }

  String direction = command.substring(0, commaIndex);
  direction.toLowerCase(); // Case-insensitive

  int speed = command.substring(commaIndex + 1).toInt();
  speed = constrain(speed, 0, 100);
  int pwmSpeed = constrain(map(speed, 0, 100, 30, 255), 0, 255);

  Serial.print("Command: ");
  Serial.print(direction);
  Serial.print(", Speed: ");
  Serial.println(speed);

  if (direction == "forward") moveForward(pwmSpeed);
  else if (direction == "backward") moveBackward(pwmSpeed);
  else if (direction == "left") turnLeft(pwmSpeed);
  else if (direction == "right") turnRight(pwmSpeed);
  else if (direction == "stop") stopMotors();
  else {
    Serial.println("ERROR: Unknown direction command");
    stopMotors();
  }
}

// Motor control functions
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
