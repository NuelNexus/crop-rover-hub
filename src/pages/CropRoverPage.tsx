import AppLayout from "@/components/layout/AppLayout";
import { Bot, Camera, MapPin, Clock, Wifi, Battery } from "lucide-react";

const botImages = [
  { id: 1, field: "Field A - Section 2", time: "10:32 AM", status: "Healthy crop detected" },
  { id: 2, field: "Field A - Section 3", time: "10:45 AM", status: "Possible pest damage" },
  { id: 3, field: "Field B - Section 1", time: "11:05 AM", status: "Irrigation needed" },
  { id: 4, field: "Field C - Section 4", time: "11:22 AM", status: "Healthy crop detected" },
];

const CropRoverPage = () => (
  <AppLayout>
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">CropRover Bot</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="stat-card lg:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-semibold">CropRover v2.1</h2>
              <span className="text-xs text-success flex items-center gap-1"><Wifi className="w-3 h-3" /> Online</span>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Battery</span><span className="font-medium flex items-center gap-1"><Battery className="w-4 h-4" /> 87%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-medium flex items-center gap-1"><MapPin className="w-4 h-4" /> Field A</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-medium">Auto-patrol</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Scans today</span><span className="font-medium">24</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Anomalies</span><span className="font-medium text-warning">3</span></div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <Camera className="w-5 h-5" /> Bot Captured Images
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {botImages.map((img) => (
              <div key={img.id} className="stat-card">
                <div className="w-full h-32 bg-secondary rounded-xl mb-3 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium flex items-center gap-1"><MapPin className="w-3 h-3" /> {img.field}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock className="w-3 h-3" /> {img.time}</p>
                <p className="text-xs mt-1 text-primary font-medium">{img.status}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
);

export default CropRoverPage;
