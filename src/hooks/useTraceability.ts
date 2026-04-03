import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TraceabilityBatch = {
  id: string;
  product_name: string;
  batch_code: string;
  created_at: string;
  steps: TraceabilityStep[];
};

export type TraceabilityStep = {
  id: string;
  batch_id: string;
  label: string;
  step_date: string;
  location: string;
  is_done: boolean;
  sort_order: number;
};

export const useTraceabilityBatches = () =>
  useQuery({
    queryKey: ["traceability"],
    queryFn: async () => {
      const { data: batches, error: bErr } = await supabase.from("traceability_batches").select("*").order("created_at", { ascending: false });
      if (bErr) throw bErr;
      const { data: steps, error: sErr } = await supabase.from("traceability_steps").select("*").order("sort_order");
      if (sErr) throw sErr;
      return (batches as any[]).map(b => ({
        ...b,
        steps: (steps as any[]).filter(s => s.batch_id === b.id),
      })) as TraceabilityBatch[];
    },
  });

export const useAddBatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (batch: { product_name: string; batch_code: string }) => {
      const { data, error } = await supabase.from("traceability_batches").insert(batch).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["traceability"] }); toast.success("Batch created"); },
    onError: (e) => toast.error(e.message),
  });
};

export const useAddStep = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (step: Omit<TraceabilityStep, "id">) => {
      const { error } = await supabase.from("traceability_steps").insert(step);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["traceability"] }); toast.success("Step added"); },
    onError: (e) => toast.error(e.message),
  });
};

export const useToggleStep = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_done }: { id: string; is_done: boolean }) => {
      const { error } = await supabase.from("traceability_steps").update({ is_done }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["traceability"] }),
  });
};
