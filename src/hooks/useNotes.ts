import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FarmNote = {
  id: string;
  text: string;
  created_at: string;
};

export const useNotes = () =>
  useQuery({
    queryKey: ["farm_notes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("farm_notes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as FarmNote[];
    },
  });

export const useAddNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const { data, error } = await supabase.from("farm_notes").insert({ text }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["farm_notes"] }); toast.success("Note added"); },
    onError: (e) => toast.error(e.message),
  });
};

export const useDeleteNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("farm_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["farm_notes"] }); },
    onError: (e) => toast.error(e.message),
  });
};
