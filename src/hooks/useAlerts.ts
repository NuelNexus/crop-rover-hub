import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Alert = {
  id: string;
  message: string;
  severity: string;
  is_read: boolean;
  user_id: string | null;
  created_at: string;
};

export const useAlerts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["alerts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("alerts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Alert[];
    },
    enabled: !!user,
  });
};

export const useMarkAlertRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alerts").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
};

export const useAddAlert = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (alert: { message: string; severity: string }) => {
      const { error } = await supabase.from("alerts").insert({ ...alert, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
};
