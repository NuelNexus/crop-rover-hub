*PRESEC STEAM TEAM GIS EXHIBITION PROJECT 1*
Harvest Iq Social media marketplace for Farmers 
The most effective way to buy and sell crops
stay updated as a farmer,etc

---

## CropRover ESP32 setup (L298N)

This project controls the CropRover from the CropRover page (no external control page). The web app sends HTTP commands to the ESP32 at `/drive`, and the ESP32 drives the L298N motor driver directly.

### Static IP (ESP32)
The generated CropRover ESP32 sketch uses a fixed IP so the UI can always reach it:

- IP: 192.168.1.90
- Gateway: 192.168.1.1
- Subnet: 255.255.255.0
- DNS: 1.1.1.1

If your network uses a different range, update the IP values in the ESP32 sketch before flashing.

### L298N motor wiring (ESP32)

The ESP32 motor sketch uses these pin mappings:

- LEFT_ENABLE: GPIO 25
- LEFT_IN1: GPIO 12
- LEFT_IN2: GPIO 13
- RIGHT_ENABLE: GPIO 26
- RIGHT_IN1: GPIO 14
- RIGHT_IN2: GPIO 27

Wire these to the L298N input and enable pins. Power the motors from the L298N motor supply and share GND across the ESP32 and L298N.

### Sketch

- ESP32: use the generated CropRover ESP32 sketch from the ESP32 Devices page.
