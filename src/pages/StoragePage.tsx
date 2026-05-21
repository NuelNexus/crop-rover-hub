import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import StorageConditions from "@/components/dashboard/StorageConditions";
import { useStorageBins, useAddStorageBin, useUpdateStorageBin } from "@/hooks/useStorage";
import { useDevices, useSensorReadings, useRealtimeSensorReadings } from "@/hooks/useESP32";
import { AlertTriangle, TrendingDown, LineChart as LineChartIcon, Plus, X, Brain, Thermometer, Droplets, Wind, ScanLine } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ReactMarkdown from "react-markdown";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const tempRange = { min: 10, max: 28 };
const humidityRange = { min: 50, max: 70 };
const mq135Max = 400;

const StoragePage = () => {
  const { data: bins } = useStorageBins();
  const addBin = useAddStorageBin();
  const updateBin = useUpdateStorageBin();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ bin_name: "", crop_stored: "", temperature: 20, humidity: 50, fill_percentage: 0, spoilage_risk: "Low", status: "Good" });

  const { data: devices } = useDevices();
  const storageDevices = (devices || []).filter((d) => d.device_type === "storage_unit");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const { data: readings } = useSensorReadings(selectedDeviceId || undefined);
  useRealtimeSensorReadings(selectedDeviceId || undefined);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState<string>("");

  useEffect(() => {
    if (!selectedDeviceId && storageDevices.length > 0) {
      setSelectedDeviceId(storageDevices[0].id);
    }
  }, [selectedDeviceId, storageDevices]);

  const latestByType = useMemo(() => {
    const map: Record<string, { value: number; unit: string; at: string }> = {};
    (readings || []).forEach((r) => {
      if (!map[r.sensor_type]) map[r.sensor_type] = { value: Number(r.value), unit: r.unit, at: r.created_at };
    });
    return map;
  }, [readings]);

  const temp = latestByType.temperature?.value;
  const humidity = latestByType.humidity?.value;
  const air = latestByType.mq135?.value;
  const rfid = latestByType.rfid_uid?.value;

  const statusFlags = {
    temp: typeof temp === "number" && (temp < tempRange.min || temp > tempRange.max),
    humidity: typeof humidity === "number" && (humidity < humidityRange.min || humidity > humidityRange.max),
    air: typeof air === "number" && air > mq135Max,
  };

  const handleAnalyze = async () => {
    if (!selectedDeviceId) return;
    setAiLoading(true);
    setAiText("");

    const prompt = `You are an agricultural storage assistant. Analyze the storage unit sensor data and provide short, actionable steps.\n\nSensor data:\n- Temperature: ${temp ?? "n/a"} C (ideal ${tempRange.min}-${tempRange.max})\n- Humidity: ${humidity ?? "n/a"}% (ideal ${humidityRange.min}-${humidityRange.max})\n- Air quality (MQ135 raw): ${air ?? "n/a"} (alert > ${mq135Max})\n- Last RFID UID (decimal): ${rfid ?? "n/a"}\n\nIf any value is outside the ideal range, prioritize corrective actions. Provide 3-5 bullet points max.`;

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify({
          messages: [
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!res.ok) throw new Error(`AI request failed (${res.status})`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              assistantText += delta;
              setAiText(assistantText);
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setAiText(`Error: ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const spoilageData = (bins || []).map(b => ({
    name: b.bin_name,
    risk: b.spoilage_risk === "Low" ? Math.round(b.humidity * 0.05) : b.spoilage_risk === "Medium" ? Math.round(b.humidity * 0.25) : Math.round(b.humidity * 0.5),
    humidity: b.humidity,
    temp: b.temperature,
  }));

  const handleAdd = () => {
    if (!form.bin_name.trim() || !form.crop_stored.trim()) return;
    addBin.mutate(form);
    setForm({ bin_name: "", crop_stored: "", temperature: 20, humidity: 50, fill_percentage: 0, spoilage_risk: "Low", status: "Good" });
    setShowAdd(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Smart Storage</h1>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Add Bin
          </button>
        </div>

        {showAdd && (
          <div className="stat-card space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Add Storage Bin</h3><button onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input value={form.bin_name} onChange={e => setForm({ ...form, bin_name: e.target.value })} placeholder="Bin name (e.g. Bin D)" className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              <input value={form.crop_stored} onChange={e => setForm({ ...form, crop_stored: e.target.value })} placeholder="Crop stored" className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              <div className="flex items-center gap-2"><span className="text-xs">Temp:</span><input type="number" value={form.temperature} onChange={e => setForm({ ...form, temperature: Number(e.target.value) })} className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm" /><span className="text-xs">°C</span></div>
              <div className="flex items-center gap-2"><span className="text-xs">Humidity:</span><input type="number" value={form.humidity} onChange={e => setForm({ ...form, humidity: Number(e.target.value) })} className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm" /><span className="text-xs">%</span></div>
              <div className="flex items-center gap-2"><span className="text-xs">Fill:</span><input type="number" min={0} max={100} value={form.fill_percentage} onChange={e => setForm({ ...form, fill_percentage: Number(e.target.value) })} className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm" /><span className="text-xs">%</span></div>
            </div>
            <button onClick={handleAdd} disabled={addBin.isPending} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-medium hover:opacity-90">{addBin.isPending ? "Adding..." : "Add Bin"}</button>
          </div>
        )}

        <StorageConditions />

        <div className="stat-card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold">Storage Unit Sensors</h2>
              <p className="text-xs text-muted-foreground">Live readings from the storage ESP32 device</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedDeviceId || ""}
                onChange={(e) => setSelectedDeviceId(e.target.value || null)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm"
              >
                {storageDevices.map((d) => (
                  <option key={d.id} value={d.id}>{d.device_name}</option>
                ))}
                {storageDevices.length === 0 && <option value="">No storage devices</option>}
              </select>
              <button
                onClick={handleAnalyze}
                disabled={aiLoading || !selectedDeviceId}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                <Brain className={`w-4 h-4 ${aiLoading ? "animate-pulse" : ""}`} />
                {aiLoading ? "Analyzing..." : "AI Recommendations"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`bg-secondary/50 rounded-xl p-3 ${statusFlags.temp ? "border border-warning" : ""}`}>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Thermometer className="w-3 h-3" /> Temperature</p>
              <p className="font-display text-xl font-bold">{typeof temp === "number" ? `${temp.toFixed(1)} C` : "--"}</p>
              <p className="text-[10px] text-muted-foreground">Ideal {tempRange.min}-{tempRange.max} C</p>
            </div>
            <div className={`bg-secondary/50 rounded-xl p-3 ${statusFlags.humidity ? "border border-warning" : ""}`}>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Droplets className="w-3 h-3" /> Humidity</p>
              <p className="font-display text-xl font-bold">{typeof humidity === "number" ? `${humidity.toFixed(0)}%` : "--"}</p>
              <p className="text-[10px] text-muted-foreground">Ideal {humidityRange.min}-{humidityRange.max}%</p>
            </div>
            <div className={`bg-secondary/50 rounded-xl p-3 ${statusFlags.air ? "border border-warning" : ""}`}>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Wind className="w-3 h-3" /> MQ135</p>
              <p className="font-display text-xl font-bold">{typeof air === "number" ? `${air.toFixed(0)} raw` : "--"}</p>
              <p className="text-[10px] text-muted-foreground">Alert &gt; {mq135Max} raw</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><ScanLine className="w-3 h-3" /> RFID</p>
              <p className="font-display text-xl font-bold">{typeof rfid === "number" ? rfid.toFixed(0) : "--"}</p>
              <p className="text-[10px] text-muted-foreground">Last scanned UID</p>
            </div>
          </div>

          <div className="bg-secondary/30 rounded-xl p-4">
            {aiText ? (
              <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                <ReactMarkdown>{aiText}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Tap AI Recommendations for guidance based on current conditions.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
              <LineChartIcon className="w-5 h-5" /> Spoilage Risk by Bin
            </h2>
            <div className="stat-card">
              {spoilageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={spoilageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(80,15%,88%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} unit="%" />
                    <Tooltip />
                    <Line type="monotone" dataKey="risk" stroke="hsl(0,72%,51%)" strokeWidth={2} dot />
                    <Line type="monotone" dataKey="humidity" stroke="hsl(210,80%,55%)" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-8">No storage data</p>}
            </div>
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold mb-3">Spoilage Predictions</h2>
            <div className="space-y-3">
              {(bins || []).filter(b => b.spoilage_risk !== "Low").map(b => (
                <div key={b.id} className="stat-card border-l-4 border-l-warning">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{b.bin_name} — {b.crop_stored}</p>
                      <p className="text-xs text-muted-foreground mt-1">Humidity at {b.humidity}%, temperature {b.temperature}°C. Estimated {Math.round(b.humidity * 0.25)}% spoilage risk within 48h if uncorrected.</p>
                      <button onClick={() => updateBin.mutate({ id: b.id, spoilage_risk: "Low", status: "Good" })} className="text-xs text-primary font-medium mt-2 hover:underline">Mark as resolved</button>
                    </div>
                  </div>
                </div>
              ))}
              {(bins || []).filter(b => b.spoilage_risk === "Low").map(b => (
                <div key={b.id} className="stat-card border-l-4 border-l-primary">
                  <div className="flex items-start gap-3">
                    <TrendingDown className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{b.bin_name} — {b.crop_stored}</p>
                      <p className="text-xs text-muted-foreground mt-1">Conditions stable. Spoilage risk below 2% for the next 7 days.</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default StoragePage;
