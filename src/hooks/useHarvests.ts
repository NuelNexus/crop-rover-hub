import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  user_id: string | null;
  created_at: string;
};

export const useHarvests = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["harvests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("harvests").select("*").order("harvest_date", { ascending: false });
      if (error) throw error;
      return data as Harvest[];
    },
    enabled: !!user,
  });
};

export const useAddHarvest = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (harvest: { crop_name: string; field: string; quantity: number; unit?: string; quality_grade?: string; notes?: string }) => {
      const { data, error } = await supabase.from("harvests").insert({ ...harvest, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["harvests"] }); toast.success("Harvest recorded"); },
    onError: (e) => toast.error(e.message),
  });
};

export const useDeleteHarvest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("harvests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["harvests"] }); toast.success("Harvest removed"); },
    onError: (e) => toast.error(e.message),
  });
};
