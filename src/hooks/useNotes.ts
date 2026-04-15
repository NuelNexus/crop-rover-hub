import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type FarmNote = {
  id: string;
  text: string;
  user_id: string | null;
  created_at: string;
};

export const useNotes = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["farm_notes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("farm_notes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as FarmNote[];
    },
    enabled: !!user,
  });
};

export const useAddNote = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (text: string) => {
      const { data, error } = await supabase.from("farm_notes").insert({ text, user_id: user!.id }).select().single();
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
