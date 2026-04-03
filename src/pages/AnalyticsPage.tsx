import AppLayout from "@/components/layout/AppLayout";
import { useFinancials } from "@/hooks/useFinancials";
import { useHarvests } from "@/hooks/useHarvests";
import { TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const AnalyticsPage = () => {
  const { data: financials } = useFinancials();
  const { data: harvests } = useHarvests();

  const totalIncome = financials?.filter(f => f.type === "income").reduce((s, f) => s + Number(f.amount), 0) || 0;
  const totalExpenses = financials?.filter(f => f.type === "expense").reduce((s, f) => s + Number(f.amount), 0) || 0;
  const totalYield = harvests?.reduce((s, h) => s + Number(h.quantity), 0) || 0;
  const netProfit = totalIncome - totalExpenses;

  const expensesByCategory = financials
    ? Object.entries(
        financials.filter(f => f.type === "expense").reduce((acc, f) => {
          acc[f.category] = (acc[f.category] || 0) + Number(f.amount);
          return acc;
        }, {} as Record<string, number>)
      ).map(([category, amount]) => ({ category, amount }))
    : [];

  const incomeByMonth = financials
    ? Object.entries(
        financials.filter(f => f.type === "income").reduce((acc, f) => {
          const month = new Date(f.record_date).toLocaleString("default", { month: "short" });
          acc[month] = (acc[month] || 0) + Number(f.amount);
          return acc;
        }, {} as Record<string, number>)
      ).map(([month, revenue]) => ({ month, revenue }))
    : [];

  const stats = [
    { label: "Total Revenue", value: `$${(totalIncome / 1000).toFixed(1)}K`, change: "+12%", up: true },
    { label: "Total Yield", value: `${totalYield} T`, change: "+8%", up: true },
    { label: "Expenses", value: `$${(totalExpenses / 1000).toFixed(1)}K`, change: "+3%", up: false },
    { label: "Net Profit", value: `$${(netProfit / 1000).toFixed(1)}K`, change: netProfit > 0 ? "+15%" : "-5%", up: netProfit > 0 },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Analytics</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
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
            {incomeByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={incomeByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(80,15%,88%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(145,63%,42%)" fill="hsl(145,63%,42%)" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No income data yet</p>}
          </div>

          <div className="stat-card">
            <h2 className="font-display text-lg font-semibold mb-4">Expenses by Category</h2>
            {expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={expensesByCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(80,15%,88%)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="amount" fill="hsl(36,90%,55%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No expense data yet</p>}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AnalyticsPage;
