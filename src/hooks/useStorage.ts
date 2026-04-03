import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type StorageBin = {
  id: string;
  bin_name: string;
  crop_stored: string;
  temperature: number;
  humidity: number;
  fill_percentage: number;
  spoilage_risk: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export const useStorageBins = () =>
  useQuery({
    queryKey: ["storage_bins"],
    queryFn: async () => {
      const { data, error } = await supabase.from("storage_bins").select("*").order("bin_name");
      if (error) throw error;
      return data as StorageBin[];
    },
  });

export const useAddStorageBin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bin: Omit<StorageBin, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.from("storage_bins").insert(bin).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["storage_bins"] }); toast.success("Storage bin added"); },
    onError: (e) => toast.error(e.message),
  });
};

export const useUpdateStorageBin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StorageBin> & { id: string }) => {
      const { error } = await supabase.from("storage_bins").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["storage_bins"] }); toast.success("Bin updated"); },
    onError: (e) => toast.error(e.message),
  });
};
