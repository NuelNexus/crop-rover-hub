import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useFinancials, useAddFinancial } from "@/hooks/useFinancials";
import { DollarSign, Plus, X, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const COLORS = ["hsl(145,63%,42%)", "hsl(36,90%,55%)", "hsl(210,80%,55%)", "hsl(0,72%,51%)", "hsl(145,63%,62%)", "hsl(25,95%,53%)"];

const FinancesPage = () => {
  const { data: records, isLoading } = useFinancials();
  const addRecord = useAddFinancial();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: "income" as string, category: "", amount: "", description: "", record_date: new Date().toISOString().split("T")[0] });

  const totalIncome = records?.filter(r => r.type === "income").reduce((s, r) => s + Number(r.amount), 0) || 0;
  const totalExpenses = records?.filter(r => r.type === "expense").reduce((s, r) => s + Number(r.amount), 0) || 0;
  const net = totalIncome - totalExpenses;

  const expensePie = records
    ? Object.entries(records.filter(r => r.type === "expense").reduce((a, r) => { a[r.category] = (a[r.category] || 0) + Number(r.amount); return a; }, {} as Record<string, number>))
        .map(([name, value]) => ({ name, value }))
    : [];

  const handleAdd = () => {
    if (!form.category.trim() || !form.amount) return;
    addRecord.mutate({ ...form, amount: Number(form.amount), description: form.description || null });
    setForm({ type: "income", category: "", amount: "", description: "", record_date: new Date().toISOString().split("T")[0] });
    setShowAdd(false);
  };

  if (isLoading) return <AppLayout><div className="animate-pulse h-96" /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold flex items-center gap-2"><DollarSign className="w-6 h-6" /> Finances</h1>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Add Record
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-success" />Total Income</p>
            <p className="font-display text-3xl font-bold mt-1 text-success">${totalIncome.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowDownRight className="w-3 h-3 text-destructive" />Total Expenses</p>
            <p className="font-display text-3xl font-bold mt-1 text-destructive">${totalExpenses.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground">Net Profit</p>
            <p className={`font-display text-3xl font-bold mt-1 ${net >= 0 ? "text-success" : "text-destructive"}`}>${net.toLocaleString()}</p>
          </div>
        </div>

        {showAdd && (
          <div className="stat-card space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Add Financial Record</h3><button onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm">
                <option value="income">Income</option><option value="expense">Expense</option>
              </select>
              <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Category (e.g. Wheat Sales)" className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Amount ($)" className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              <input type="date" value={form.record_date} onChange={e => setForm({ ...form, record_date: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" className="col-span-full sm:col-span-1 px-3 py-2 rounded-xl border border-border bg-background text-sm" />
            </div>
            <button onClick={handleAdd} disabled={addRecord.isPending} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-medium hover:opacity-90">{addRecord.isPending ? "Saving..." : "Save Record"}</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="stat-card">
            <h2 className="font-display text-lg font-semibold mb-4">Expense Breakdown</h2>
            {expensePie.length > 0 ? (
              <div className="flex items-center gap-6">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expensePie} dataKey="value" innerRadius={40} outerRadius={70} strokeWidth={0}>
                        {expensePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {expensePie.map((e, i) => (
                    <div key={e.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span>{e.name}</span>
                      <span className="font-semibold ml-auto">${e.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No expenses yet</p>}
          </div>

          <div className="stat-card">
            <h2 className="font-display text-lg font-semibold mb-4">Recent Transactions</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(records || []).slice(0, 10).map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${r.type === "income" ? "bg-success/10" : "bg-destructive/10"}`}>
                      {r.type === "income" ? <TrendingUp className="w-4 h-4 text-success" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.category}</p>
                      <p className="text-xs text-muted-foreground">{r.record_date}</p>
                    </div>
                  </div>
                  <span className={`font-display font-bold ${r.type === "income" ? "text-success" : "text-destructive"}`}>
                    {r.type === "income" ? "+" : "-"}${Number(r.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default FinancesPage;
