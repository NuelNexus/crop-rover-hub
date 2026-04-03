import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Crop = {
  id: string;
  name: string;
  stage: string;
  progress: number;
  category: string;
  field_location: string | null;
  planted_date: string | null;
  expected_harvest: string | null;
  yield_amount: number | null;
  yield_unit: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const useCrops = () =>
  useQuery({
    queryKey: ["crops"],
    queryFn: async () => {
      const { data, error } = await supabase.from("crops").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Crop[];
    },
  });

export const useAddCrop = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (crop: Omit<Crop, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.from("crops").insert(crop).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crops"] }); toast.success("Crop added"); },
    onError: (e) => toast.error(e.message),
  });
};

export const useUpdateCrop = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Crop> & { id: string }) => {
      const { error } = await supabase.from("crops").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crops"] }); toast.success("Crop updated"); },
    onError: (e) => toast.error(e.message),
  });
};

export const useDeleteCrop = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crops").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crops"] }); toast.success("Crop deleted"); },
    onError: (e) => toast.error(e.message),
  });
};
