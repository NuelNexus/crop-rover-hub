import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Plus, Sprout, Package, AlertTriangle, TrendingUp, StickyNote } from "lucide-react";
import { useNotes, useAddNote } from "@/hooks/useNotes";
import { useCrops } from "@/hooks/useCrops";
import { useStorageBins } from "@/hooks/useStorage";
import { useAlerts } from "@/hooks/useAlerts";
import { useDevices, useSensorReadings } from "@/hooks/useESP32";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

const HomePage = () => {
  const { user } = useAuth();
  const { data: notes } = useNotes();
  const { data: crops } = useCrops();
  const { data: bins } = useStorageBins();
  const { data: alerts } = useAlerts();
  const { data: devices } = useDevices();
  const firstDevice = devices?.[0];
  const { data: readings } = useSensorReadings(firstDevice?.id);
  const addNote = useAddNote();
  const [newNote, setNewNote] = useState("");

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Farmer";

  const totalCrops = crops?.length || 0;
  const avgProgress = crops?.length ? Math.round(crops.reduce((s, c) => s + (c.progress || 0), 0) / crops.length) : 0;
  const totalBins = bins?.length || 0;
  const avgFill = bins?.length ? Math.round(bins.reduce((s, b) => s + (b.fill_percentage || 0), 0) / bins.length) : 0;
  const unreadAlerts = alerts?.filter((a) => !a.is_read).length || 0;
  const onlineDevices = devices?.filter((d) => d.is_online).length || 0;

  // Latest reading per sensor type from first device
  const sensorTypes = [...new Set(readings?.map((r) => r.sensor_type) || [])];
  const latestReadings = sensorTypes.map((t) => readings?.find((r) => r.sensor_type === t)).filter(Boolean).slice(0, 4);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNote.mutate(newNote);
    setNewNote("");
  };

  const stats = [
    { label: "Active Crops", value: totalCrops, sub: `${avgProgress}% avg progress`, icon: Sprout, color: "text-success", to: "/crops" },
    { label: "Storage Bins", value: totalBins, sub: `${avgFill}% avg fill`, icon: Package, color: "text-primary", to: "/storage" },
    { label: "Open Alerts", value: unreadAlerts, sub: `${alerts?.length || 0} total`, icon: AlertTriangle, color: "text-warning", to: "/" },
    { label: "Devices Online", value: `${onlineDevices}/${devices?.length || 0}`, sub: "ESP32 sensors", icon: TrendingUp, color: "text-primary", to: "/esp32" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Hello, {displayName} 👋</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Link key={s.label} to={s.to} className="bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="font-display text-3xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Crops */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">My Crops</h2>
              <Link to="/crops" className="text-xs text-primary font-medium">View all</Link>
            </div>
            {(!crops || crops.length === 0) ? (
              <div className="text-center py-10 text-muted-foreground">
                <Sprout className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No crops yet</p>
                <Link to="/crops" className="text-xs text-primary font-medium">Add your first crop</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {crops.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                      <Sprout className="w-5 h-5 text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <span className="text-xs text-muted-foreground">{c.progress}%</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-success rounded-full" style={{ width: `${c.progress}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground capitalize">{c.stage}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live sensors */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Live Sensors</h2>
              <Link to="/esp32" className="text-xs text-primary font-medium">Manage</Link>
            </div>
            {!firstDevice ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No devices connected</p>
                <Link to="/esp32" className="text-xs text-primary font-medium">Add ESP32</Link>
              </div>
            ) : latestReadings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Waiting for readings…</p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">{firstDevice.device_name}</p>
                {latestReadings.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between bg-secondary/50 rounded-xl p-3">
                    <span className="text-xs capitalize text-muted-foreground">{r.sensor_type.replace("_", " ")}</span>
                    <span className="font-display font-bold">{r.value.toFixed(1)}<span className="text-xs ml-1 text-muted-foreground">{r.unit}</span></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alerts */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <h2 className="font-display text-lg font-semibold mb-4">Recent Alerts</h2>
            {(!alerts || alerts.length === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-6">No alerts. All systems healthy.</p>
            ) : (
              <div className="space-y-2">
                {alerts.slice(0, 4).map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 ${a.severity === "high" ? "text-destructive" : a.severity === "medium" ? "text-warning" : "text-muted-foreground"}`} />
                    <div className="flex-1">
                      <p className="text-sm">{a.message}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <StickyNote className="w-5 h-5 text-warning" />
              <h2 className="font-display text-lg font-semibold">Farm Notes</h2>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
              {(!notes || notes.length === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-4">No notes yet</p>
              ) : notes.slice(0, 4).map((n) => (
                <div key={n.id} className="p-3 rounded-xl bg-secondary/50">
                  <p className="text-sm">{n.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                placeholder="Quick note…"
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm"
              />
              <button
                onClick={handleAddNote}
                disabled={addNote.isPending || !newNote.trim()}
                className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default HomePage;
