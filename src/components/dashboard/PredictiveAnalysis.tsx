import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const months = [
  { month: "January '22", data: [{ name: "Wheat", pct: 59 }, { name: "Rice", pct: 81 }, { name: "Maize", pct: 13 }] },
  { month: "February '22", data: [{ name: "Wheat", pct: 59 }, { name: "Rice", pct: 81 }, { name: "Maize", pct: 13 }] },
  { month: "March '22", data: [{ name: "Wheat", pct: 59 }, { name: "Rice", pct: 81 }, { name: "Maize", pct: 13 }] },
];

const costData = [
  { name: "Wheat", value: 76 },
  { name: "Rice", value: 24 },
];
const COLORS = ["hsl(145, 63%, 42%)", "hsl(145, 63%, 72%)"];

const PredictiveAnalysis = () => (
  <div>
    <h2 className="font-display text-lg font-semibold mb-3">Predictive analysis</h2>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {months.map((m) => (
        <div key={m.month} className="stat-card">
          <p className="font-display text-sm font-semibold mb-3">{m.month}</p>
          {m.data.map((d) => (
            <div key={d.name} className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{d.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-8 text-right">{d.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      ))}

      <div className="stat-card">
        <p className="font-display text-sm font-semibold mb-1">Harvesting Cost</p>
        <div className="flex items-center gap-3">
          <div className="w-20 h-20">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={costData} dataKey="value" innerRadius={22} outerRadius={36} strokeWidth={0}>
                  {costData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs space-y-1">
            <p>Wheat <span className="font-medium">$76K</span></p>
            <p>Rice <span className="font-medium">$24K</span></p>
            <p className="text-muted-foreground text-[10px]">Total estimation</p>
            <p className="font-display text-2xl font-bold">$100K</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default PredictiveAnalysis;
