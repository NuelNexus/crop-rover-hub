import AppLayout from "@/components/layout/AppLayout";
import { FileSearch, ArrowRight, CheckCircle, Clock, MapPin } from "lucide-react";

const traceItems = [
  {
    product: "Organic Wheat — Batch #W2024-156",
    steps: [
      { label: "Planted", date: "Feb 21, 2024", location: "Field A", done: true },
      { label: "Fertilized", date: "Mar 15, 2024", location: "Field A", done: true },
      { label: "Harvested", date: "Jun 10, 2024", location: "Field A", done: true },
      { label: "Stored", date: "Jun 11, 2024", location: "Bin A", done: true },
      { label: "Quality Check", date: "Jun 12, 2024", location: "Lab", done: true },
      { label: "Shipped", date: "Pending", location: "—", done: false },
    ],
  },
  {
    product: "Basmati Rice — Batch #R2024-089",
    steps: [
      { label: "Planted", date: "Mar 01, 2024", location: "Field B", done: true },
      { label: "Irrigated", date: "Apr 20, 2024", location: "Field B", done: true },
      { label: "Harvested", date: "Jul 05, 2024", location: "Field B", done: false },
    ],
  },
];

const TraceabilityPage = () => (
  <AppLayout>
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold flex items-center gap-2">
        <FileSearch className="w-6 h-6" /> Traceability
      </h1>

      {traceItems.map((item) => (
        <div key={item.product} className="stat-card">
          <h2 className="font-display font-semibold mb-4">{item.product}</h2>
          <div className="space-y-0">
            {item.steps.map((s, i) => (
              <div key={i} className="flex items-start gap-3 pb-4 relative">
                {i < item.steps.length - 1 && (
                  <div className="absolute left-[11px] top-6 w-0.5 h-full bg-border" />
                )}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${s.done ? "bg-primary" : "bg-secondary"}`}>
                  {s.done ? <CheckCircle className="w-3.5 h-3.5 text-primary-foreground" /> : <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
                <div>
                  <p className="font-medium text-sm">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.date} · <MapPin className="w-3 h-3 inline" /> {s.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </AppLayout>
);

export default TraceabilityPage;
