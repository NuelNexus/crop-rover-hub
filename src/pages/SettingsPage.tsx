import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Settings, Bell, MapPin, Thermometer, Droplets, Shield } from "lucide-react";
import { toast } from "sonner";

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    farmName: "Green Valley Farm",
    location: "Midwest Region, USA",
    tempUnit: "celsius",
    alertsEnabled: true,
    emailAlerts: true,
    pushAlerts: false,
    moistureThreshold: 30,
    tempThreshold: 35,
    humidityThreshold: 80,
    autoIrrigation: true,
  });

  const save = () => toast.success("Settings saved successfully");

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Settings className="w-6 h-6" /> Settings</h1>

        {/* Farm Profile */}
        <div className="stat-card space-y-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2"><MapPin className="w-5 h-5" /> Farm Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Farm Name</label>
              <input value={settings.farmName} onChange={e => setSettings({ ...settings, farmName: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Location</label>
              <input value={settings.location} onChange={e => setSettings({ ...settings, location: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Temperature Unit</label>
              <select value={settings.tempUnit} onChange={e => setSettings({ ...settings, tempUnit: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm">
                <option value="celsius">Celsius (°C)</option><option value="fahrenheit">Fahrenheit (°F)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="stat-card space-y-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Bell className="w-5 h-5" /> Notifications</h2>
          {[
            { key: "alertsEnabled", label: "System Alerts" },
            { key: "emailAlerts", label: "Email Notifications" },
            { key: "pushAlerts", label: "Push Notifications" },
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between">
              <span className="text-sm">{n.label}</span>
              <button
                onClick={() => setSettings({ ...settings, [n.key]: !(settings as any)[n.key] })}
                className={`w-12 h-6 rounded-full transition-colors relative ${(settings as any)[n.key] ? "bg-primary" : "bg-secondary"}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform ${(settings as any)[n.key] ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
          ))}
        </div>

        {/* Sensor Thresholds */}
        <div className="stat-card space-y-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Thermometer className="w-5 h-5" /> Sensor Thresholds</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><Droplets className="w-3 h-3" /> Soil Moisture Min (%)</label>
              <input type="number" value={settings.moistureThreshold} onChange={e => setSettings({ ...settings, moistureThreshold: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><Thermometer className="w-3 h-3" /> Max Temperature (°C)</label>
              <input type="number" value={settings.tempThreshold} onChange={e => setSettings({ ...settings, tempThreshold: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><Droplets className="w-3 h-3" /> Max Humidity (%)</label>
              <input type="number" value={settings.humidityThreshold} onChange={e => setSettings({ ...settings, humidityThreshold: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Auto-Irrigation When Below Threshold</span>
            <button
              onClick={() => setSettings({ ...settings, autoIrrigation: !settings.autoIrrigation })}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.autoIrrigation ? "bg-primary" : "bg-secondary"}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform ${settings.autoIrrigation ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>

        <button onClick={save} className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
          Save Settings
        </button>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
