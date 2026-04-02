import AppLayout from "@/components/layout/AppLayout";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const revenueData = [
  { month: "Jan", revenue: 12000 }, { month: "Feb", revenue: 15000 }, { month: "Mar", revenue: 18000 },
  { month: "Apr", revenue: 22000 }, { month: "May", revenue: 28000 }, { month: "Jun", revenue: 25000 },
];

const expenseData = [
  { category: "Seeds", amount: 8500 }, { category: "Fertilizer", amount: 6200 },
  { category: "Labor", amount: 12000 }, { category: "Equipment", amount: 4500 },
  { category: "Storage", amount: 3200 }, { category: "Transport", amount: 2800 },
];

const AnalyticsPage = () => (
  <AppLayout>
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: "$120K", change: "+12%", up: true },
          { label: "Total Yield", value: "1,105 T", change: "+8%", up: true },
          { label: "Expenses", value: "$37.2K", change: "+3%", up: false },
          { label: "Net Profit", value: "$82.8K", change: "+15%", up: true },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="font-display text-2xl font-bold mt-1">{s.value}</p>
            <p className={`text-xs font-medium mt-1 flex items-center gap-1 ${s.up ? "text-success" : "text-destructive"}`}>
              {s.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {s.change}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="stat-card">
          <h2 className="font-display text-lg font-semibold mb-4">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(80,15%,88%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="hsl(145,63%,42%)" fill="hsl(145,63%,42%)" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <h2 className="font-display text-lg font-semibold mb-4">Expenses by Category</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={expenseData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(80,15%,88%)" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="amount" fill="hsl(36,90%,55%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  </AppLayout>
);

export default AnalyticsPage;
