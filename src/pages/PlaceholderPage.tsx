import AppLayout from "@/components/layout/AppLayout";
import { Construction } from "lucide-react";

const PlaceholderPage = ({ title }: { title: string }) => (
  <AppLayout>
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Construction className="w-12 h-12 text-muted-foreground mb-4" />
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground mt-2">This section is coming soon.</p>
    </div>
  </AppLayout>
);

export default PlaceholderPage;
