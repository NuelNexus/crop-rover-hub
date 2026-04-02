import AppLayout from "@/components/layout/AppLayout";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const categoryData = [
  { name: "Fruits", value: 34500, pct: 20 },
  { name: "Vegetables", value: 2700, pct: 33 },
  { name: "Grains", value: 364500, pct: 38 },
];
const COLORS = ["hsl(145,63%,42%)", "hsl(36,90%,55%)", "hsl(145,63%,62%)"];

const yieldData = [
  { month: "Jan", yield: 120 },
  { month: "Feb", yield: 150 },
  { month: "Mar", yield: 180 },
  { month: "Apr", yield: 220 },
  { month: "May", yield: 300 },
  { month: "Jun", yield: 280 },
];

const CropsPage = () => (
  <AppLayout>
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Crops Overview</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="stat-card">
          <h2 className="font-display text-lg font-semibold mb-4">By Category</h2>
          <div className="flex items-center gap-6">
            <div className="w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" innerRadius={40} outerRadius={70} strokeWidth={0}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {categoryData.map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span>{c.name}</span>
                  <span className="font-semibold ml-auto">{c.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <h2 className="font-display text-lg font-semibold mb-4">Yield Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={yieldData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(80,15%,88%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="yield" fill="hsl(145,63%,42%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  </AppLayout>
);

export default CropsPage;
