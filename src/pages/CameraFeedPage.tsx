import { useState, useRef } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useDevices } from "@/hooks/useESP32";
import {
  useCameraCaptures,
  useRealtimeCaptures,
  useUploadAndAnalyze,
  useAnalyzeCapture,
  useDeleteCapture,
} from "@/hooks/useCameraFeed";
import { Camera, Upload, Sparkles, Trash2, AlertTriangle, CheckCircle2, RefreshCw, MapPin } from "lucide-react";
import { format } from "date-fns";

const severityStyles: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  low: "bg-success/10 text-success border-success/30",
};

const CameraFeedPage = () => {
  const { data: devices } = useDevices();
  const camDevices = (devices || []).filter((d) =>
    d.device_type === "crop_rover" || d.device_type === "esp32_cam"
  );
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: captures, isLoading } = useCameraCaptures(deviceId);
  useRealtimeCaptures(deviceId);
  const upload = useUploadAndAnalyze();
  const analyze = useAnalyzeCapture();
  const del = useDeleteCapture();

  const activeDevice = deviceId || camDevices[0]?.id;

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeDevice) return;
    upload.mutate({ file, deviceId: activeDevice, location });
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-success flex items-center justify-center shadow-sm">
              <Camera className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Live Camera Feed</h1>
              <p className="text-sm text-muted-foreground">ESP32-CAM captures · AI pest & disease detection</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="w-3 h-3" /> Auto-refreshing every 8s
          </div>
        </div>

        {/* Controls */}
        <div className="stat-card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Camera device</label>
              <select
                value={activeDevice || ""}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
              >
                {camDevices.length === 0 && <option value="">No camera devices — register one in ESP32 Devices</option>}
                {camDevices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.device_name} ({d.device_type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Field / location tag</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Field A — Row 3"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
              />
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} hidden />
              <button
                disabled={!activeDevice || upload.isPending}
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {upload.isPending ? (
                  <><Sparkles className="w-4 h-4 animate-pulse" /> Uploading & analyzing…</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload & Analyze</>
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Tip: ESP32-CAM auto-uploads images via the generated Arduino sketch. You can also test manually here.
          </p>
        </div>

        {/* Feed */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="stat-card animate-pulse h-72" />
            ))}
          </div>
        ) : (captures || []).length === 0 ? (
          <div className="stat-card text-center py-16">
            <Camera className="w-12 h-12 mx-auto opacity-30 mb-3" />
            <p className="text-sm text-muted-foreground">No camera captures yet</p>
            <p className="text-xs text-muted-foreground">Upload an image or wire up an ESP32-CAM</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(captures || []).map((c) => (
              <div key={c.id} className="stat-card overflow-hidden p-0 group">
                <div className="relative aspect-video bg-secondary">
                  <img src={c.image_url} alt="capture" className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => analyze.mutate(c)}
                      className="p-1.5 rounded-lg bg-card/90 backdrop-blur hover:bg-card text-foreground"
                      title="Re-analyze"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => del.mutate(c.id)}
                      className="p-1.5 rounded-lg bg-card/90 backdrop-blur hover:bg-destructive hover:text-destructive-foreground text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {c.analyzed && c.detected_issue && (
                    <div className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-1 rounded-lg border ${severityStyles[c.severity] || severityStyles.low}`}>
                      {c.severity.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      {c.detected_issue?.toLowerCase().includes("healthy") ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : c.analyzed ? (
                        <AlertTriangle className="w-4 h-4 text-warning" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-muted-foreground animate-pulse" />
                      )}
                      {c.detected_issue || "Analyzing…"}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(c.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                  {c.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {c.location}
                    </p>
                  )}
                  {c.ai_analysis && (
                    <p className="text-xs text-foreground/80 leading-relaxed">{c.ai_analysis}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CameraFeedPage;
