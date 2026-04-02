import { Bot, Warehouse, Wifi, WifiOff, Battery, Thermometer } from "lucide-react";

const devices = [
  {
    name: "CropRover Bot",
    icon: Bot,
    status: "Online",
    online: true,
    battery: 87,
    signal: "Strong",
    lastSeen: "Now",
    location: "Field A - Section 3",
  },
  {
    name: "Smart Storage Unit",
    icon: Warehouse,
    status: "Online",
    online: true,
    battery: 100,
    signal: "Strong",
    lastSeen: "Now",
    location: "Main Storage Facility",
  },
];

const DeviceStatus = () => (
  <div>
    <h2 className="font-display text-lg font-semibold mb-3">Device Status</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {devices.map((d) => (
        <div key={d.name} className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <d.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{d.name}</p>
              <div className="flex items-center gap-1 text-xs">
                {d.online ? (
                  <Wifi className="w-3 h-3 text-success" />
                ) : (
                  <WifiOff className="w-3 h-3 text-destructive" />
                )}
                <span className={d.online ? "text-success" : "text-destructive"}>{d.status}</span>
              </div>
            </div>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span className="flex items-center gap-1"><Battery className="w-3 h-3" /> Battery</span>
              <span className="font-medium text-foreground">{d.battery}%</span>
            </div>
            <div className="flex justify-between">
              <span>Signal</span>
              <span className="font-medium text-foreground">{d.signal}</span>
            </div>
            <div className="flex justify-between">
              <span>Location</span>
              <span className="font-medium text-foreground">{d.location}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default DeviceStatus;
