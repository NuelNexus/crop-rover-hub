import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type FinancialRecord = {
  id: string;
  type: string;
  category: string;
  amount: number;
  description: string | null;
  record_date: string;
  user_id: string | null;
  created_at: string;
};

export const useFinancials = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["financials", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("financial_records").select("*").order("record_date", { ascending: false });
      if (error) throw error;
      return data as FinancialRecord[];
    },
    enabled: !!user,
  });
};

export const useAddFinancial = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (record: { amount: number; type: string; category: string; description?: string; record_date?: string }) => {
      const { data, error } = await supabase.from("financial_records").insert({ ...record, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["financials"] }); toast.success("Record added"); },
    onError: (e) => toast.error(e.message),
  });
};

export const useDeleteFinancial = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["financials"] }); toast.success("Record deleted"); },
    onError: (e) => toast.error(e.message),
  });
};
