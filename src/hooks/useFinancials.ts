import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FinancialRecord = {
  id: string;
  type: string;
  category: string;
  amount: number;
  description: string | null;
  record_date: string;
  created_at: string;
};

export const useFinancials = () =>
  useQuery({
    queryKey: ["financials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("financial_records").select("*").order("record_date", { ascending: false });
      if (error) throw error;
      return data as FinancialRecord[];
    },
  });

export const useAddFinancial = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<FinancialRecord, "id" | "created_at">) => {
      const { data, error } = await supabase.from("financial_records").insert(record).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["financials"] }); toast.success("Record added"); },
    onError: (e) => toast.error(e.message),
  });
};
