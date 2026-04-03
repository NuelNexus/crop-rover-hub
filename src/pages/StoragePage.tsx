import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import StorageConditions from "@/components/dashboard/StorageConditions";
import { useStorageBins, useAddStorageBin, useUpdateStorageBin } from "@/hooks/useStorage";
import { AlertTriangle, TrendingDown, LineChart as LineChartIcon, Plus, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const StoragePage = () => {
  const { data: bins } = useStorageBins();
  const addBin = useAddStorageBin();
  const updateBin = useUpdateStorageBin();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ bin_name: "", crop_stored: "", temperature: 20, humidity: 50, fill_percentage: 0, spoilage_risk: "Low", status: "Good" });

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
