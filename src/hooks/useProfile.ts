import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  farm_name: string | null;
  location: string | null;
  banner_url: string | null;
  accent_color: string | null;
  website: string | null;
  phone: string | null;
  specialties: string[] | null;
  social_links: Record<string, string> | null;
  theme: string | null;
  created_at: string;
  updated_at: string;
};

export const useProfile = (userId?: string) => {
  const { user } = useAuth();
  const targetId = userId || user?.id;
  return useQuery({
    queryKey: ["profile", targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", targetId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!targetId,
  });
};

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("user_id", user!.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useUploadProfileImage = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ file, kind }: { file: File; kind: "avatar" | "banner" }) => {
      const path = `${user!.id}/${kind}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("marketplace").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("marketplace").getPublicUrl(path);
      return data.publicUrl;
    },
  });
};
