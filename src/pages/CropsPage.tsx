import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useCrops, useAddCrop, useDeleteCrop, useUpdateCrop } from "@/hooks/useCrops";
import { useCropAnalysis } from "@/hooks/useCropAnalysis";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Plus, Trash2, Brain, Loader2, X, Edit2, Check } from "lucide-react";

const COLORS = ["hsl(145,63%,42%)", "hsl(36,90%,55%)", "hsl(145,63%,62%)", "hsl(210,80%,55%)"];

const stages = ["Seed Started", "Vegetative", "Flowering", "Ripening", "Maturing", "Matured"];

const CropsPage = () => {
  const { data: crops, isLoading } = useCrops();
  const addCrop = useAddCrop();
  const deleteCrop = useDeleteCrop();
  const updateCrop = useUpdateCrop();
  const { analysis, loading: aiLoading, analyze } = useCropAnalysis();

  const [showAdd, setShowAdd] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStage, setEditStage] = useState("");
  const [editProgress, setEditProgress] = useState(0);

  const [form, setForm] = useState({
    name: "", category: "Grains", field_location: "", stage: "Seed Started",
    progress: 0, planted_date: "", expected_harvest: "",
  });

  const categoryData = crops
    ? Object.entries(crops.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }))
    : [];

  const stageData = crops
    ? stages.map(s => ({ stage: s, count: crops.filter(c => c.stage === s).length })).filter(s => s.count > 0)
    : [];

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addCrop.mutate({
      name: form.name, category: form.category, field_location: form.field_location || null,
      stage: form.stage, progress: form.progress,
      planted_date: form.planted_date || null, expected_harvest: form.expected_harvest || null,
      yield_amount: null, yield_unit: "Tons", notes: null,
    });
    setForm({ name: "", category: "Grains", field_location: "", stage: "Seed Started", progress: 0, planted_date: "", expected_harvest: "" });
    setShowAdd(false);
  };

  const handleAnalyze = (crop: any) => {
    setSelectedCrop(crop.id);
    analyze({ name: crop.name, stage: crop.stage, progress: crop.progress, field_location: crop.field_location, category: crop.category });
  };

  const handleSaveEdit = (id: string) => {
    updateCrop.mutate({ id, stage: editStage, progress: editProgress });
    setEditingId(null);
  };

  if (isLoading) return <AppLayout><div className="animate-pulse h-96" /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Crops Overview</h1>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Add Crop
          </button>
        </div>

        {showAdd && (
          <div className="stat-card space-y-3">
            <h3 className="font-semibold">Add New Crop</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Crop name" className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm">
                <option>Grains</option><option>Fruits</option><option>Vegetables</option><option>Legumes</option>
              </select>
              <input value={form.field_location} onChange={e => setForm({ ...form, field_location: e.target.value })} placeholder="Field location" className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
              <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm">
                {stages.map(s => <option key={s}>{s}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={100} value={form.progress} onChange={e => setForm({ ...form, progress: Number(e.target.value) })} className="flex-1" />
                <span className="text-sm font-medium w-10">{form.progress}%</span>
              </div>
              <input type="date" value={form.planted_date} onChange={e => setForm({ ...form, planted_date: e.target.value })} className="px-3 py-2 rounded-xl border border-border bg-background text-sm" />
            </div>
            <button onClick={handleAdd} disabled={addCrop.isPending} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-medium hover:opacity-90">
              {addCrop.isPending ? "Adding..." : "Save Crop"}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="stat-card">
            <h2 className="font-display text-lg font-semibold mb-4">By Category</h2>
            {categoryData.length > 0 ? (
              <div className="flex items-center gap-6">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" innerRadius={40} outerRadius={70} strokeWidth={0}>
                        {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {categoryData.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span>{c.name}</span>
                      <span className="font-semibold ml-auto">{c.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-sm text-muted-foreground">No data yet</p>}
          </div>

          <div className="stat-card">
            <h2 className="font-display text-lg font-semibold mb-4">By Growth Stage</h2>
            {stageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(80,15%,88%)" />
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(145,63%,42%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">No data yet</p>}
          </div>
        </div>

        {/* Crops List */}
        <div className="stat-card">
          <h2 className="font-display text-lg font-semibold mb-4">All Crops</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium">Stage</th>
                  <th className="pb-3 font-medium">Progress</th>
                  <th className="pb-3 font-medium">Field</th>
                  <th className="pb-3 font-medium">Planted</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(crops || []).map(c => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-3 font-medium">{c.name}</td>
                    <td className="py-3">{c.category}</td>
                    <td className="py-3">
                      {editingId === c.id ? (
                        <select value={editStage} onChange={e => setEditStage(e.target.value)} className="px-2 py-1 rounded border border-border bg-background text-xs">
                          {stages.map(s => <option key={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">{c.stage}</span>
                      )}
                    </td>
                    <td className="py-3">
                      {editingId === c.id ? (
                        <input type="number" min={0} max={100} value={editProgress} onChange={e => setEditProgress(Number(e.target.value))} className="w-16 px-2 py-1 rounded border border-border bg-background text-xs" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-secondary rounded-full">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${c.progress}%` }} />
                          </div>
                          <span className="text-xs">{c.progress}%</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3">{c.field_location || "—"}</td>
                    <td className="py-3">{c.planted_date || "—"}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        {editingId === c.id ? (
                          <>
                            <button onClick={() => handleSaveEdit(c.id)} className="p-1.5 rounded-lg hover:bg-success/10 text-success"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditingId(c.id); setEditStage(c.stage); setEditProgress(c.progress); }} className="p-1.5 rounded-lg hover:bg-secondary" title="Edit"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleAnalyze(c)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary" title="AI Analysis">
                              {aiLoading && selectedCrop === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                            </button>
                            <button onClick={() => deleteCrop.mutate(c.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="Delete"><Trash2 className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Analysis Panel */}
        {analysis && selectedCrop && (
          <div className="stat-card border-l-4 border-l-primary">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">AI Crop Analysis — {crops?.find(c => c.id === selectedCrop)?.name}</h2>
              </div>
              <button onClick={() => { setSelectedCrop(null); }} className="p-1 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className="bg-secondary/50 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Health Score</p>
                <p className="font-display text-3xl font-bold text-primary">{analysis.health_score}<span className="text-sm">/100</span></p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Pest Risk</p>
                <p className={`font-display text-xl font-bold ${analysis.pest_risk === "Low" ? "text-success" : analysis.pest_risk === "Medium" ? "text-warning" : "text-destructive"}`}>{analysis.pest_risk}</p>
                <p className="text-xs text-muted-foreground mt-1">{analysis.pest_details}</p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Expected Yield</p>
                <p className="font-display text-lg font-bold">{analysis.expected_yield}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm mb-1">Growth Analysis</h4>
                <p className="text-sm text-muted-foreground">{analysis.growth_analysis}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Recommendations</h4>
                <ul className="space-y-1">
                  {analysis.recommendations?.map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary font-bold">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <h4 className="font-semibold text-sm mb-1">🌱 Soil Care</h4>
                  <p className="text-xs text-muted-foreground">{analysis.soil_recommendations}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">💧 Water Needs</h4>
                  <p className="text-xs text-muted-foreground">{analysis.water_needs}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">🌤️ Weather Sensitivity</h4>
                  <p className="text-xs text-muted-foreground">{analysis.weather_sensitivity}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">📅 Harvest Window</h4>
                  <p className="text-xs text-muted-foreground">{analysis.optimal_harvest_window}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CropsPage;
