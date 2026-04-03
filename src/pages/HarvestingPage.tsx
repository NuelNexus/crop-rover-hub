import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useHarvests, useAddHarvest } from "@/hooks/useHarvests";
import { useCrops } from "@/hooks/useCrops";
import { Tractor, Plus, X, Award } from "lucide-react";

const HarvestingPage = () => {
  const { data: harvests, isLoading } = useHarvests();
  const { data: crops } = useCrops();
  const addHarvest = useAddHarvest();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ crop_name: "", field: "", quantity: "", unit: "Tons", harvest_date: new Date().toISOString().split("T")[0], quality_grade: "A", notes: "" });

  const handleAdd = () => {
    if (!form.crop_name.trim() || !form.field.trim() || !form.quantity) return;
    addHarvest.mutate({ ...form, quantity: Number(form.quantity), notes: form.notes || null });
    setForm({ crop_name: "", field: "", quantity: "", unit: "Tons", harvest_date: new Date().toISOString().split("T")[0], quality_grade: "A", notes: "" });
    setShowAdd(false);
  };

  const totalHarvested = harvests?.reduce((s, h) => s + Number(h.quantity), 0) || 0;
  const gradeA = harvests?.filter(h => h.quality_grade === "A").length || 0;
  const readyCrops = crops?.filter(c => c.progress >= 90) || [];

  if (isLoading) return <AppLayout><div className="animate-pulse h-96" /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Tractor className="w-6 h-6" /> Harvesting</h1>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Record Harvest
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card">
            <p className="text-xs text-muted-foreground">Total Harvested</p>
            <p className="font-display text-3xl font-bold mt-1">{totalHarvested} <span className="text-base font-normal text-muted-foreground">Tons</span></p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground">Grade A Harvests</p>
            <p className="font-display text-3xl font-bold mt-1 flex items-center gap-2"><Award className="w-6 h-6 text-warning" /> {gradeA}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground">Ready to Harvest</p>
            <p className="font-display text-3xl font-bold mt-1 text-primary">{readyCrops.length} <span className="text-base font-normal text-muted-foreground">crops</span></p>
            {readyCrops.map(c => <span key={c.id} className="text-xs text-muted-foreground">{c.name} ({c.progress}%) </span>)}
          </div>
        </div>

        {showAdd && (
          <div className="stat-card space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Record Harvest</h3><button onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <select value={form.crop_name} onChange={e => setForm({ ...form, crop_name: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm">
                <option value="">Select crop...</option>
                {(crops || []).map(c => <option key={c.id} value={c.name}>{c.name} — {c.field_location}</option>)}
              </select>
              <input value={form.field} onChange={e => setForm({ ...form, field: e.target.value })} placeholder="Field" className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              <div className="flex gap-2">
                <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="Quantity" className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm">
                  <option>Tons</option><option>Kg</option><option>Bags</option>
                </select>
              </div>
              <input type="date" value={form.harvest_date} onChange={e => setForm({ ...form, harvest_date: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              <select value={form.quality_grade} onChange={e => setForm({ ...form, quality_grade: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm">
                <option value="A">Grade A</option><option value="B">Grade B</option><option value="C">Grade C</option>
              </select>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optional)" className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
            </div>
            <button onClick={handleAdd} disabled={addHarvest.isPending} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-medium hover:opacity-90">{addHarvest.isPending ? "Saving..." : "Save Harvest"}</button>
          </div>
        )}

        <div className="stat-card">
          <h2 className="font-display text-lg font-semibold mb-4">Harvest Records</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Crop</th>
                  <th className="pb-3 font-medium">Field</th>
                  <th className="pb-3 font-medium">Quantity</th>
                  <th className="pb-3 font-medium">Grade</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {(harvests || []).map(h => (
                  <tr key={h.id} className="border-b border-border/50">
                    <td className="py-3 font-medium">{h.crop_name}</td>
                    <td className="py-3">{h.field}</td>
                    <td className="py-3">{h.quantity} {h.unit}</td>
                    <td className="py-3"><span className={`px-2 py-1 rounded-full text-xs ${h.quality_grade === "A" ? "bg-primary/10 text-primary" : h.quality_grade === "B" ? "bg-warning/10 text-warning" : "bg-secondary text-muted-foreground"}`}>Grade {h.quality_grade}</span></td>
                    <td className="py-3">{h.harvest_date}</td>
                    <td className="py-3 text-muted-foreground">{h.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!harvests || harvests.length === 0) && <p className="text-sm text-muted-foreground text-center py-8">No harvests recorded yet</p>}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default HarvestingPage;
