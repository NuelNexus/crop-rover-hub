import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ESP32Device = {
  id: string;
  user_id: string;
  device_name: string;
  device_type: string;
  ip_address: string | null;
  api_key: string;
  is_online: boolean;
  last_seen: string | null;
  created_at: string;
};

export type SensorReading = {
  id: string;
  device_id: string;
  sensor_type: string;
  value: number;
  unit: string;
  created_at: string;
};

export const useDevices = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["esp32_devices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("esp32_devices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ESP32Device[];
    },
    enabled: !!user,
  });
};

export const useAddDevice = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (device: { device_name: string; device_type: string; ip_address?: string }) => {
      const { data, error } = await supabase
        .from("esp32_devices")
        .insert({ ...device, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["esp32_devices"] });
      toast.success("Device added");
    },
    onError: (e) => toast.error(e.message),
  });
};

export const useDeleteDevice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("esp32_devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["esp32_devices"] });
      toast.success("Device removed");
    },
    onError: (e) => toast.error(e.message),
  });
};

export const useSensorReadings = (deviceId?: string) => {
  return useQuery({
    queryKey: ["sensor_readings", deviceId],
    queryFn: async () => {
      let query = supabase
        .from("esp32_sensor_readings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (deviceId) query = query.eq("device_id", deviceId);
      const { data, error } = await query;
      if (error) throw error;
      return data as SensorReading[];
    },
    enabled: !!deviceId,
    refetchInterval: 5000,
  });
};

export const useRealtimeSensorReadings = (deviceId?: string) => {
  const qc = useQueryClient();

  useEffect(() => {
    if (!deviceId) return;

    const channel = supabase
      .channel(`sensor-${deviceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "esp32_sensor_readings",
          filter: `device_id=eq.${deviceId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["sensor_readings", deviceId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceId, qc]);
};

// ESP32 Arduino code generator — supports crop_rover, storage_unit, and esp32_cam
export const generateESP32Code = (device: ESP32Device, supabaseUrl: string, supabaseAnonKey: string) => {
  if (device.device_type === "esp32_cam") {
    return `
// ============================================
// ESP32-CAM Code for: ${device.device_name}
// Captures images and uploads to agriCultur for
// AI pest/disease detection via Gemini Vision.
// Board: AI-Thinker ESP32-CAM
// ============================================

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

const char* supabaseUrl = "${supabaseUrl}";
const char* supabaseKey = "${supabaseAnonKey}";
const char* deviceId    = "${device.id}";
const char* fieldLabel  = "Field A - Section 1";

// AI-Thinker ESP32-CAM pins
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  String url = String(supabaseUrl) + "/rest/v1/esp32_devices?id=eq." + String(deviceId);
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", String("Bearer ") + supabaseKey);
  http.addHeader("Prefer", "return=minimal");
  String ip = WiFi.localIP().toString();
  String body = String("{\\"is_online\\":true,\\"last_seen\\":\\"") + "now()" + "\\",\\"ip_address\\":\\"" + ip + "\\"}";
  // Use Postgres now() via a JSON payload — send ISO time instead for safety:
  body = String("{\\"is_online\\":true,\\"ip_address\\":\\"") + ip + "\\"}";
  int code = http.sendRequest("PATCH", body);
  Serial.printf("Heartbeat: %d\\n", code);
  http.end();
}

bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM; config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM; config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM; config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM; config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM; config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM; config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM; config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM; config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_SVGA;
  config.jpeg_quality = 12;
  config.fb_count = 1;
  return esp_camera_init(&config) == ESP_OK;
}

void uploadImage(camera_fb_t* fb) {
  String fileName = String(deviceId) + "/" + String(millis()) + ".jpg";
  String storageUrl = String(supabaseUrl) + "/storage/v1/object/crop-cam/" + fileName;

  HTTPClient http;
  http.begin(storageUrl);
  http.addHeader("Authorization", String("Bearer ") + supabaseKey);
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Content-Type", "image/jpeg");
  int code = http.POST(fb->buf, fb->len);
  Serial.printf("Storage upload: %d\\n", code);
  http.end();
  if (code < 200 || code >= 300) return;

  String publicUrl = String(supabaseUrl) + "/storage/v1/object/public/crop-cam/" + fileName;

  HTTPClient http2;
  String insertUrl = String(supabaseUrl) + "/rest/v1/esp32_camera_captures";
  http2.begin(insertUrl);
  http2.addHeader("Content-Type", "application/json");
  http2.addHeader("apikey", supabaseKey);
  http2.addHeader("Authorization", String("Bearer ") + supabaseKey);
  http2.addHeader("Prefer", "return=representation");

  StaticJsonDocument<512> doc;
  doc["device_id"] = deviceId;
  doc["image_url"] = publicUrl;
  doc["location"] = fieldLabel;
  String body; serializeJson(doc, body);
  int c2 = http2.POST(body);
  String resp = http2.getString();
  Serial.printf("Capture row: %d\\n", c2);

  String captureId = "";
  StaticJsonDocument<1024> rdoc;
  if (deserializeJson(rdoc, resp) == DeserializationError::Ok && rdoc.is<JsonArray>()) {
    captureId = String((const char*) rdoc[0]["id"]);
  }
  http2.end();

  if (captureId.length() > 0) {
    HTTPClient http3;
    String fnUrl = String(supabaseUrl) + "/functions/v1/analyze-cam-image";
    http3.begin(fnUrl);
    http3.addHeader("Content-Type", "application/json");
    http3.addHeader("Authorization", String("Bearer ") + supabaseKey);
    StaticJsonDocument<512> fdoc;
    fdoc["image_url"] = publicUrl;
    fdoc["capture_id"] = captureId;
    String fbody; serializeJson(fdoc, fbody);
    int c3 = http3.POST(fbody);
    Serial.printf("AI analysis: %d\\n", c3);
    http3.end();
  }
}

void setup() {
  Serial.begin(115200);
  if (!initCamera()) { Serial.println("Camera init failed"); return; }
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\\nWiFi connected!");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) { delay(2000); return; }
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) { Serial.println("Capture failed"); delay(2000); return; }
  uploadImage(fb);
  esp_camera_fb_return(fb);
  delay(60000); // capture every 60s
}
`.trim();
  }

  return `
// ============================================
// ESP32 Code for: ${device.device_name}
// Device Type: ${device.device_type}
// Generated by agriCultur
// ============================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

const char* supabaseUrl = "${supabaseUrl}";
const char* supabaseKey = "${supabaseAnonKey}";
const char* deviceId = "${device.id}";

${device.device_type === "crop_rover" ? `#define SOIL_MOISTURE_PIN 34
#define DHT_PIN 4
#define LIGHT_SENSOR_PIN 35
#define PH_SENSOR_PIN 32` : `#define TEMP_SENSOR_PIN 34
#define HUMIDITY_SENSOR_PIN 35
#define WEIGHT_SENSOR_PIN 32`}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(1000); Serial.println("Connecting..."); }
  Serial.println("Connected!");
}

void sendReading(const char* sensorType, float value, const char* unit) {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  String url = String(supabaseUrl) + "/rest/v1/esp32_sensor_readings";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", String("Bearer ") + supabaseKey);
  http.addHeader("Prefer", "return=minimal");
  StaticJsonDocument<256> doc;
  doc["device_id"] = deviceId;
  doc["sensor_type"] = sensorType;
  doc["value"] = value;
  doc["unit"] = unit;
  String body; serializeJson(doc, body);
  int code = http.POST(body);
  Serial.printf("Sent %s: %.2f %s (HTTP %d)\\n", sensorType, value, unit, code);
  http.end();
}

void loop() {
${device.device_type === "crop_rover" ? `  float soilMoisture = analogRead(SOIL_MOISTURE_PIN) / 40.95;
  float lightIntensity = analogRead(LIGHT_SENSOR_PIN) / 4.095;
  float soilPH = (analogRead(PH_SENSOR_PIN) / 4095.0) * 14.0;
  sendReading("soil_moisture", soilMoisture, "%");
  sendReading("light_intensity", lightIntensity, "lux");
  sendReading("soil_ph", soilPH, "pH");` : `  float temperature = analogRead(TEMP_SENSOR_PIN) / 40.95 * 0.5;
  float humidity = analogRead(HUMIDITY_SENSOR_PIN) / 40.95;
  float weight = analogRead(WEIGHT_SENSOR_PIN) / 4.095;
  sendReading("temperature", temperature, "°C");
  sendReading("humidity", humidity, "%");
  sendReading("weight", weight, "kg");`}
  delay(30000);
}
`.trim();
};
