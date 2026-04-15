import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useTraceabilityBatches, useAddBatch, useAddStep, useToggleStep } from "@/hooks/useTraceability";
import { FileSearch, CheckCircle, Clock, MapPin, Plus, X } from "lucide-react";

const TraceabilityPage = () => {
  const { data: batches, isLoading } = useTraceabilityBatches();
  const addBatch = useAddBatch();
  const addStep = useAddStep();
  const toggleStep = useToggleStep();
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [showAddStep, setShowAddStep] = useState<string | null>(null);
  const [batchForm, setBatchForm] = useState({ product_name: "", batch_code: "" });
  const [stepForm, setStepForm] = useState({ label: "", step_date: "", location: "" });

  const handleAddBatch = () => {
    if (!batchForm.product_name.trim() || !batchForm.batch_code.trim()) return;
    addBatch.mutate(batchForm);
    setBatchForm({ product_name: "", batch_code: "" });
    setShowAddBatch(false);
  };

  const handleAddStep = (batchId: string, maxOrder: number) => {
    if (!stepForm.label.trim()) return;
    addStep.mutate({ batch_id: batchId, label: stepForm.label, step_date: stepForm.step_date || new Date().toLocaleDateString(), location: stepForm.location || "—", is_done: false, sort_order: maxOrder + 1 });
    setStepForm({ label: "", step_date: "", location: "" });
    setShowAddStep(null);
  };

  if (isLoading) return <AppLayout><div className="animate-pulse h-96" /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold flex items-center gap-2"><FileSearch className="w-6 h-6" /> Traceability</h1>
          <button onClick={() => setShowAddBatch(!showAddBatch)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> New Batch
          </button>
        </div>

        {showAddBatch && (
          <div className="stat-card space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Create Batch</h3><button onClick={() => setShowAddBatch(false)}><X className="w-4 h-4" /></button></div>
            <div className="flex gap-3">
              <input value={batchForm.product_name} onChange={e => setBatchForm({ ...batchForm, product_name: e.target.value })} placeholder="Product name" className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              <input value={batchForm.batch_code} onChange={e => setBatchForm({ ...batchForm, batch_code: e.target.value })} placeholder="Batch code (e.g. W2024-200)" className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              <button onClick={handleAddBatch} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium">Create</button>
            </div>
          </div>
        )}

        {(batches || []).map((item) => (
          <div key={item.id} className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold">{item.product_name} — Batch #{item.batch_code}</h2>
              <button onClick={() => setShowAddStep(showAddStep === item.id ? null : item.id)} className="text-xs text-primary font-medium flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Step
              </button>
            </div>

            {showAddStep === item.id && (
              <div className="flex gap-2 mb-4 p-3 bg-secondary/50 rounded-xl">
                <input value={stepForm.label} onChange={e => setStepForm({ ...stepForm, label: e.target.value })} placeholder="Step (e.g. Inspected)" className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm" />
                <input value={stepForm.step_date} onChange={e => setStepForm({ ...stepForm, step_date: e.target.value })} placeholder="Date" className="px-3 py-2 rounded-xl border border-border bg-background text-sm w-40" />
                <input value={stepForm.location} onChange={e => setStepForm({ ...stepForm, location: e.target.value })} placeholder="Location" className="px-3 py-2 rounded-xl border border-border bg-background text-sm w-32" />
                <button onClick={() => handleAddStep(item.id, Math.max(0, ...item.traceability_steps.map(s => s.sort_order)))} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium">Add</button>
              </div>
            )}

            <div className="space-y-0">
              {item.traceability_steps.map((s, i) => (
                <div key={s.id} className="flex items-start gap-3 pb-4 relative">
                  {i < item.traceability_steps.length - 1 && <div className="absolute left-[11px] top-6 w-0.5 h-full bg-border" />}
                  <button
                    onClick={() => toggleStep.mutate({ id: s.id, is_done: !s.is_done })}
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${s.is_done ? "bg-primary" : "bg-secondary hover:bg-primary/20"}`}
                  >
                    {s.is_done ? <CheckCircle className="w-3.5 h-3.5 text-primary-foreground" /> : <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  <div>
                    <p className="font-medium text-sm">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.step_date} · <MapPin className="w-3 h-3 inline" /> {s.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
};

export default TraceabilityPage;
