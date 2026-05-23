import { useCallback, useMemo, useRef, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useDevices, useSensorReadings, useRealtimeSensorReadings } from "@/hooks/useESP32";
import { useCameraCaptures, useRealtimeCaptures } from "@/hooks/useCameraFeed";
import CameraStream from "@/components/cam/CameraStream";
import { Bot, Camera, MapPin, Clock, Wifi, WifiOff, Activity, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import "@/styles/joystick.scss";

const CropRoverPage = () => {
  const { data: devices } = useDevices();
  const rovers = (devices || []).filter((d) => d.device_type === "crop_rover" || d.device_type === "esp32_bot_control");
  const cams = (devices || []).filter((d) => d.device_type === "esp32_cam");

  const [roverId, setRoverId] = useState<string | undefined>(undefined);
  const [camId, setCamId] = useState<string | undefined>(undefined);
  const activeRover = rovers.find((d) => d.id === (roverId || rovers[0]?.id));
  const activeCam = cams.find((d) => d.id === (camId || cams[0]?.id));

  const { data: readings } = useSensorReadings(activeRover?.id);
  useRealtimeSensorReadings(activeRover?.id);
  const { data: captures } = useCameraCaptures(activeCam?.id);
  useRealtimeCaptures(activeCam?.id);

  // Latest reading per sensor_type
  const latest = useMemo(() => {
    const map: Record<string, { value: number; unit: string; at: string }> = {};
    (readings || []).forEach((r) => {
      if (!map[r.sensor_type]) map[r.sensor_type] = { value: Number(r.value), unit: r.unit, at: r.created_at };
    });
    return map;
  }, [readings]);

  const anomalies = (captures || []).filter((c) => c.analyzed && c.severity !== "low").length;
  const scansToday = (captures || []).filter((c) => {
    const d = new Date(c.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const hoverItems = useMemo(() => Array.from({ length: 28 }, (_, i) => i + 1), []);
  const ledItems = useMemo(() => Array.from({ length: 28 }, (_, i) => i + 1), []);

  const joystickRef = useRef<HTMLDivElement>(null);
  const lastCommandAt = useRef(0);
  const activeDirection = useRef<string | null>(null);
  const pointerActive = useRef(false);
  const pointerId = useRef<number | null>(null);

  const controlEnabled = !!activeRover?.ip_address && !!activeRover?.is_online;
  const commandUrl = activeRover?.ip_address ? `http://${activeRover.ip_address}/drive` : "";

  const sendCommand = useCallback(
    async (direction: "forward" | "backward" | "left" | "right" | "stop", speed: number) => {
      if (!controlEnabled || !commandUrl) return;
      const now = Date.now();
      if (now - lastCommandAt.current < 120 && direction === activeDirection.current) return;

      lastCommandAt.current = now;
      activeDirection.current = direction;

      try {
        await fetch(commandUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction, speed }),
        });
      } catch {
        // Ignore transient network errors; next command will retry.
      }
    },
    [commandUrl, controlEnabled]
  );

  const stopRover = useCallback(() => {
    sendCommand("stop", 0);
  }, [sendCommand]);

  const handleArrowDown = useCallback((direction: "forward" | "backward" | "left" | "right") => {
    sendCommand(direction, 70);
  }, [sendCommand]);

  const handleArrowUp = useCallback(() => {
    stopRover();
  }, [stopRover]);

  const updateFromPointer = useCallback((clientX: number, clientY: number) => {
    const target = joystickRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const radius = rect.width / 2;
    const distance = Math.min(Math.hypot(dx, dy), radius);
    const deadzone = radius * 0.18;
    if (distance < deadzone) {
      stopRover();
      return;
    }
    const speed = Math.round(((distance - deadzone) / (radius - deadzone)) * 100);
    const direction = Math.abs(dx) > Math.abs(dy)
      ? dx > 0 ? "right" : "left"
      : dy > 0 ? "backward" : "forward";
    sendCommand(direction, speed);
  }, [sendCommand, stopRover]);

  const handleJoystickDown = useCallback((event: React.PointerEvent) => {
    if (!controlEnabled) return;
    pointerActive.current = true;
    pointerId.current = event.pointerId;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    updateFromPointer(event.clientX, event.clientY);
  }, [controlEnabled, updateFromPointer]);

  const handleJoystickMove = useCallback((event: React.PointerEvent) => {
    if (!pointerActive.current) return;
    if (pointerId.current !== event.pointerId) return;
    updateFromPointer(event.clientX, event.clientY);
  }, [updateFromPointer]);

  const handleJoystickUp = useCallback((event: React.PointerEvent) => {
    if (pointerId.current !== event.pointerId) return;
    pointerActive.current = false;
    pointerId.current = null;
    stopRover();
  }, [stopRover]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-display text-2xl font-bold">CropRover Bot</h1>
          <div className="flex gap-2">
            {rovers.length > 1 && (
              <select value={activeRover?.id || ""} onChange={(e) => setRoverId(e.target.value)} className="px-3 py-2 rounded-xl border border-border bg-background text-sm">
                {rovers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.device_name} ({d.device_type.replace("_", " ")})
                  </option>
                ))}
              </select>
            )}
            {cams.length > 1 && (
              <select value={activeCam?.id || ""} onChange={(e) => setCamId(e.target.value)} className="px-3 py-2 rounded-xl border border-border bg-background text-sm">
                {cams.map((d) => <option key={d.id} value={d.id}>{d.device_name}</option>)}
              </select>
            )}
          </div>
        </div>

        {rovers.length === 0 && cams.length === 0 ? (
          <div className="stat-card text-center py-16">
            <Bot className="w-12 h-12 mx-auto opacity-30 mb-3" />
            <p className="text-sm text-muted-foreground">No CropRover or ESP32-CAM devices registered yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add one in <b>ESP32 Devices</b> to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="stat-card lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-semibold">{activeRover?.device_name || "No rover"}</h2>
                  {activeRover ? (
                    <span className={`text-xs flex items-center gap-1 ${activeRover.is_online ? "text-success" : "text-muted-foreground"}`}>
                      {activeRover.is_online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                      {activeRover.is_online ? "Online" : "Offline"}
                    </span>
                  ) : <span className="text-xs text-muted-foreground">No rover registered</span>}
                </div>
              </div>
              <div className="space-y-3 text-sm">
                {Object.keys(latest).length === 0 && activeRover && (
                  <p className="text-xs text-muted-foreground italic">Waiting for sensor data from device…</p>
                )}
                {Object.entries(latest).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                    <span className="font-medium">{v.value.toFixed(2)} {v.unit}</span>
                  </div>
                ))}
                {activeRover && (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">IP</span><span className="font-medium">{activeRover.ip_address || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Last seen</span><span className="font-medium">{activeRover.last_seen ? format(new Date(activeRover.last_seen), "HH:mm:ss") : "—"}</span></div>
                  </>
                )}
                <div className="border-t border-border pt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3" /> Scans today</p>
                    <p className="text-xl font-display font-bold">{scansToday}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Anomalies</p>
                    <p className={`text-xl font-display font-bold ${anomalies > 0 ? "text-warning" : ""}`}>{anomalies}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="stat-card p-0 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                    <Camera className="w-5 h-5" /> Live Camera Stream
                  </h2>
                  {activeCam && <span className="text-xs text-muted-foreground">{activeCam.device_name}</span>}
                </div>
                <CameraStream ip={activeCam?.ip_address || null} isOnline={!!activeCam?.is_online} className="rounded-none" />
              </div>

              <div className="stat-card p-0 overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h2 className="font-display text-lg font-semibold">CropRover Joystick</h2>
                  <p className="text-xs text-muted-foreground">
                    {controlEnabled ? "Drag the stick or use arrows to drive." : "Connect a rover with IP to enable controls."}
                  </p>
                </div>
                <div className="joystick-panel">
                  <div
                    className="joystick-wrap"
                    ref={joystickRef}
                    onPointerDown={handleJoystickDown}
                    onPointerMove={handleJoystickMove}
                    onPointerUp={handleJoystickUp}
                    onPointerCancel={handleJoystickUp}
                    onPointerLeave={handleJoystickUp}
                  >
                    <div className="joystick">
                      {hoverItems.map((hover) => (
                        <span key={`hover-${hover}`} className={`joystick__hover hover-${hover}`} />
                      ))}
                      {ledItems.map((led) => (
                        <div key={`led-${led}`} className={`joystick__led led-${led}`} />
                      ))}
                      <div className="joystick__zero" />
                      <div className="joystick__stick" />
                      <div className="joystick__ball" />
                      <ul className="menu" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="joystick-arrows" aria-label="CropRover controls">
                    <div className="joystick-arrow is-empty" />
                    <button
                      className="joystick-arrow"
                      aria-label="Move up"
                      onPointerDown={() => handleArrowDown("forward")}
                      onPointerUp={handleArrowUp}
                      onPointerLeave={handleArrowUp}
                      disabled={!controlEnabled}
                    >
                      &#9650;
                    </button>
                    <div className="joystick-arrow is-empty" />
                    <button
                      className="joystick-arrow"
                      aria-label="Move left"
                      onPointerDown={() => handleArrowDown("left")}
                      onPointerUp={handleArrowUp}
                      onPointerLeave={handleArrowUp}
                      disabled={!controlEnabled}
                    >
                      &#9664;
                    </button>
                    <div className="joystick-arrow is-empty" />
                    <button
                      className="joystick-arrow"
                      aria-label="Move right"
                      onPointerDown={() => handleArrowDown("right")}
                      onPointerUp={handleArrowUp}
                      onPointerLeave={handleArrowUp}
                      disabled={!controlEnabled}
                    >
                      &#9654;
                    </button>
                    <div className="joystick-arrow is-empty" />
                    <button
                      className="joystick-arrow"
                      aria-label="Move down"
                      onPointerDown={() => handleArrowDown("backward")}
                      onPointerUp={handleArrowUp}
                      onPointerLeave={handleArrowUp}
                      disabled={!controlEnabled}
                    >
                      &#9660;
                    </button>
                    <div className="joystick-arrow is-empty" />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="font-display text-base font-semibold mb-3">Recent Captures</h2>
                {(captures || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No captures yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(captures || []).slice(0, 4).map((c) => (
                      <div key={c.id} className="stat-card">
                        <img src={c.image_url} alt="capture" className="w-full h-32 object-cover rounded-xl mb-3" loading="lazy" />
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.location || "Unlabeled"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock className="w-3 h-3" /> {format(new Date(c.created_at), "MMM d, HH:mm")}</p>
                        <p className="text-xs mt-1 text-primary font-medium">{c.detected_issue || (c.analyzed ? "Healthy" : "Analyzing…")}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CropRoverPage;
