import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Harvest = {
  id: string;
  crop_name: string;
  field: string;
  quantity: number;
  unit: string;
  harvest_date: string;
  quality_grade: string | null;
  notes: string | null;
  created_at: string;
};

export const useHarvests = () =>
  useQuery({
    queryKey: ["harvests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("harvests").select("*").order("harvest_date", { ascending: false });
      if (error) throw error;
      return data as Harvest[];
    },
  });

export const useAddHarvest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (harvest: Omit<Harvest, "id" | "created_at">) => {
      const { data, error } = await supabase.from("harvests").insert(harvest).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["harvests"] }); toast.success("Harvest recorded"); },
    onError: (e) => toast.error(e.message),
  });
};
