import AppLayout from "@/components/layout/AppLayout";
import StorageConditions from "@/components/dashboard/StorageConditions";
import { Thermometer, Droplets, AlertTriangle, TrendingDown, LineChart as LineChartIcon } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const spoilageData = [
  { day: "Mon", risk: 5 }, { day: "Tue", risk: 8 }, { day: "Wed", risk: 12 },
  { day: "Thu", risk: 15 }, { day: "Fri", risk: 22 }, { day: "Sat", risk: 18 }, { day: "Sun", risk: 25 },
];

const StoragePage = () => (
  <AppLayout>
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Smart Storage</h1>
      <StorageConditions />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <LineChartIcon className="w-5 h-5" /> Spoilage Risk Forecast
          </h2>
          <div className="stat-card">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={spoilageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(80,15%,88%)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit="%" />
                <Tooltip />
                <Line type="monotone" dataKey="risk" stroke="hsl(0,72%,51%)" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold mb-3">Spoilage Predictions</h2>
          <div className="space-y-3">
            <div className="stat-card border-l-4 border-l-warning">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Bin B — Rice</p>
                  <p className="text-xs text-muted-foreground mt-1">Humidity rising above safe levels. Estimated 15% spoilage risk within 48h if uncorrected.</p>
                </div>
              </div>
            </div>
            <div className="stat-card border-l-4 border-l-primary">
              <div className="flex items-start gap-3">
                <TrendingDown className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Bin A — Wheat</p>
                  <p className="text-xs text-muted-foreground mt-1">Conditions stable. Spoilage risk below 2% for the next 7 days.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
);

export default StoragePage;
