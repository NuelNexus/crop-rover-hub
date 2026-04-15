import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type StorageBin = {
  id: string;
  bin_name: string;
  crop_stored: string;
  temperature: number;
  humidity: number;
  fill_percentage: number;
  status: string;
  spoilage_risk: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export const useStorageBins = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["storage_bins", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("storage_bins").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as StorageBin[];
    },
    enabled: !!user,
  });
};

export const useAddStorageBin = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (bin: Omit<StorageBin, "id" | "created_at" | "updated_at" | "user_id">) => {
      const { data, error } = await supabase.from("storage_bins").insert({ ...bin, user_id: user!.id }).select().single();
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
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<StorageBin>) => {
      const { data, error } = await supabase.from("storage_bins").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["storage_bins"] }); toast.success("Bin updated"); },
    onError: (e) => toast.error(e.message),
  });
};

export const useDeleteStorageBin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("storage_bins").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["storage_bins"] }); toast.success("Bin removed"); },
    onError: (e) => toast.error(e.message),
  });
};
