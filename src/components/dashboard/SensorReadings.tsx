import { useMemo } from "react";
import { Thermometer, Droplets, Wind, ScanLine, Activity } from "lucide-react";
import { useDevices, useSensorReadings, useRealtimeSensorReadings } from "@/hooks/useESP32";

const SensorReadings = () => {
  const { data: devices } = useDevices();
  const storageDevice = (devices || []).find(
    (d) => d.device_type === "storage_unit" || d.device_type === "uno_r4_storage"
  ) || devices?.[0];

  const { data: readings } = useSensorReadings(storageDevice?.id);
  useRealtimeSensorReadings(storageDevice?.id);

  const latestByType = useMemo(() => {
    const map: Record<string, { value: number; unit: string; at: string }> = {};
    (readings || []).forEach((r) => {
      if (!map[r.sensor_type]) map[r.sensor_type] = { value: Number(r.value), unit: r.unit, at: r.created_at };
    });
    return map;
  }, [readings]);

  const cards = [
    {
      label: "Temperature",
      value: typeof latestByType.temperature?.value === "number" ? `${latestByType.temperature.value.toFixed(1)} C` : "--",
      icon: Thermometer,
      color: "text-chart-orange",
    },
    {
      label: "Humidity",
      value: typeof latestByType.humidity?.value === "number" ? `${latestByType.humidity.value.toFixed(0)}%` : "--",
      icon: Droplets,
      color: "text-chart-blue",
    },
    {
      label: "MQ135 (Raw)",
      value: typeof latestByType.mq135?.value === "number" ? `${latestByType.mq135.value.toFixed(0)}` : "--",
      icon: Wind,
      color: "text-chart-green",
    },
    {
      label: "MQ135 (Level)",
      value: typeof latestByType.mq135_dout?.value === "number" ? `${latestByType.mq135_dout.value.toFixed(0)}` : "--",
      icon: Activity,
      color: "text-muted-foreground",
    },
    {
      label: "RFID UID",
      value: typeof latestByType.rfid_uid?.value === "number" ? latestByType.rfid_uid.value.toFixed(0) : "--",
      icon: ScanLine,
      color: "text-primary",
    },
  ];

  return (
    <div>
      <h2 className="font-display text-lg font-semibold mb-3">Live Sensor Readings</h2>
      {!storageDevice ? (
        <div className="stat-card text-center py-8 text-muted-foreground">
          <p className="text-sm">No devices connected</p>
        </div>
      ) : cards.every((c) => c.value === "--") ? (
        <div className="stat-card text-center py-8 text-muted-foreground">
          <p className="text-sm">Waiting for sensor readings...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {cards.map((s) => (
            <div key={s.label} className="stat-card flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="font-display text-lg font-bold">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SensorReadings;
