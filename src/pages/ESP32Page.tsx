import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useDevices, useAddDevice, useDeleteDevice, useSensorReadings, useRealtimeSensorReadings, generateESP32Code } from "@/hooks/useESP32";
import { Cpu, Plus, Trash2, Copy, Wifi, WifiOff, X, Code, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";

const ESP32Page = () => {
  const { data: devices, isLoading } = useDevices();
  const addDevice = useAddDevice();
  const deleteDevice = useDeleteDevice();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [showCode, setShowCode] = useState<string | null>(null);
  const [form, setForm] = useState({ device_name: "", device_type: "crop_rover", ip_address: "" });

  const { data: readings } = useSensorReadings(selectedDeviceId || undefined);
  useRealtimeSensorReadings(selectedDeviceId || undefined);

  const selectedDevice = devices?.find((d) => d.id === selectedDeviceId);

  const handleAdd = () => {
    if (!form.device_name.trim()) return;
    addDevice.mutate({ device_name: form.device_name, device_type: form.device_type, ip_address: form.ip_address || undefined });
    setForm({ device_name: "", device_type: "crop_rover", ip_address: "" });
    setShowAdd(false);
  };

  const buildCode = (device: any) =>
    generateESP32Code(device, import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

  const copyCode = (device: any) => {
    navigator.clipboard.writeText(buildCode(device));
    toast.success("ESP32 code copied to clipboard!");
  };

  const downloadCode = (device: any) => {
    const blob = new Blob([buildCode(device)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = device.device_name.replace(/[^a-z0-9_-]+/gi, "_");
    a.href = url;
    a.download = `${safeName}_${device.device_type}.ino`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Arduino sketch downloaded!");
  };

  // Group readings by sensor_type for charting
  const sensorTypes = [...new Set(readings?.map((r) => r.sensor_type) || [])];
  const chartColors = ["hsl(145,63%,42%)", "hsl(36,90%,55%)", "hsl(210,80%,55%)", "hsl(340,70%,55%)", "hsl(270,60%,55%)"];

  // Get latest reading for each sensor type
  const latestReadings = sensorTypes.map((type) => {
    const latest = readings?.find((r) => r.sensor_type === type);
    return latest ? { type: latest.sensor_type, value: latest.value, unit: latest.unit, time: latest.created_at } : null;
  }).filter(Boolean);

  if (isLoading) return <AppLayout><div className="animate-pulse h-96" /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">ESP32 Devices</h1>
              <p className="text-sm text-muted-foreground">Connect your CropRover & storage sensors</p>
            </div>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Add Device
          </button>
        </div>

        {showAdd && (
          <div className="stat-card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Register New ESP32 Device</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input value={form.device_name} onChange={(e) => setForm({ ...form, device_name: e.target.value })} placeholder="Device name" className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              <select value={form.device_type} onChange={(e) => setForm({ ...form, device_type: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm">
                <option value="crop_rover">CropRover Bot</option>
                <option value="storage_unit">Storage Unit</option>
                <option value="esp32_cam">ESP32-CAM (Vision)</option>
              </select>
              <input value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder="IP address (optional)" className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
            </div>
            <button onClick={handleAdd} disabled={addDevice.isPending} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-medium hover:opacity-90">
              {addDevice.isPending ? "Registering..." : "Register Device"}
            </button>
          </div>
        )}

        {/* Devices list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(devices || []).map((device) => (
            <div
              key={device.id}
              className={`stat-card cursor-pointer transition-all ${selectedDeviceId === device.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => setSelectedDeviceId(device.id === selectedDeviceId ? null : device.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{device.device_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{device.device_type.replace("_", " ")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {device.is_online ? <Wifi className="w-4 h-4 text-success" /> : <WifiOff className="w-4 h-4 text-muted-foreground" />}
                  <span className={`text-xs ${device.is_online ? "text-success" : "text-muted-foreground"}`}>
                    {device.is_online ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={(e) => { e.stopPropagation(); downloadCode(device); }}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Download className="w-3 h-3" /> Download .ino
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); copyCode(device); }}
                  className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-medium bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowCode(showCode === device.id ? null : device.id); }}
                  className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-medium bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <Code className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteDevice.mutate(device.id); }}
                  className="p-2 rounded-xl hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {showCode === device.id && (
                <div className="mt-3 p-3 bg-foreground/5 rounded-xl overflow-x-auto max-h-64 overflow-y-auto">
                  <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre">
                    {generateESP32Code(device, import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)}
                  </pre>
                </div>
              )}
            </div>
          ))}
          {(!devices || devices.length === 0) && (
            <div className="col-span-2 text-center py-12 text-muted-foreground">
              <Cpu className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No devices registered yet</p>
              <p className="text-xs">Click "Add Device" to register your ESP32</p>
            </div>
          )}
        </div>

        {/* Sensor readings for selected device */}
        {selectedDevice && (
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Live Readings — {selectedDevice.device_name}</h2>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <RefreshCw className="w-3 h-3" /> Auto-refreshing
              </div>
            </div>

            {latestReadings.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                  {latestReadings.map((r) => r && (
                    <div key={r.type} className="bg-secondary/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground capitalize">{r.type.replace("_", " ")}</p>
                      <p className="font-display text-xl font-bold">{r.value.toFixed(1)}<span className="text-xs font-normal ml-1">{r.unit}</span></p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(r.time), "HH:mm:ss")}</p>
                    </div>
                  ))}
                </div>

                {sensorTypes.map((type, idx) => {
                  const typeReadings = (readings || [])
                    .filter((r) => r.sensor_type === type)
                    .slice(0, 20)
                    .reverse()
                    .map((r) => ({ time: format(new Date(r.created_at), "HH:mm"), value: r.value }));
                  return (
                    <div key={type} className="mb-4">
                      <p className="text-sm font-medium capitalize mb-2">{type.replace("_", " ")}</p>
                      <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={typeReadings}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(80,15%,88%)" />
                          <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="value" stroke={chartColors[idx % chartColors.length]} strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No sensor data yet. Upload the Arduino code to your ESP32 to start streaming data.
              </p>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ESP32Page;
