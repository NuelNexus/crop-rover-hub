import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  product_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
};

export type Conversation = {
  partner_id: string;
  partner_name: string;
  last_message: string;
  last_at: string;
  unread: number;
};

// Fetch all messages involving current user, group into conversations
export const useConversations = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          qc.invalidateQueries({ queryKey: ["conversations"] });
          qc.invalidateQueries({ queryKey: ["messages"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  return useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Conversation[]> => {
      const { data: msgs, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const map = new Map<string, Conversation>();
      const partnerIds = new Set<string>();
      (msgs as Message[]).forEach((m) => {
        const partner = m.sender_id === user!.id ? m.recipient_id : m.sender_id;
        partnerIds.add(partner);
        if (!map.has(partner)) {
          map.set(partner, {
            partner_id: partner,
            partner_name: partner.slice(0, 8),
            last_message: m.content,
            last_at: m.created_at,
            unread: 0,
          });
        }
        const c = map.get(partner)!;
        if (m.recipient_id === user!.id && !m.is_read) c.unread += 1;
      });

      if (partnerIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", Array.from(partnerIds));
        profiles?.forEach((p) => {
          const c = map.get(p.user_id);
          if (c && p.display_name) c.partner_name = p.display_name;
        });
      }

      return Array.from(map.values()).sort(
        (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
      );
    },
  });
};

export const useThread = (partnerId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["messages", user?.id, partnerId],
    enabled: !!user && !!partnerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user!.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user!.id})`
        )
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Mark received messages as read
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("recipient_id", user!.id)
        .eq("sender_id", partnerId!)
        .eq("is_read", false);

      return data as Message[];
    },
    refetchInterval: 5000,
  });
};

export const useSendMessage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { recipient_id: string; content: string; product_id?: string | null }) => {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: user!.id,
          recipient_id: input.recipient_id,
          content: input.content,
          product_id: input.product_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
};

// Find a user_id by display_name or email-prefix for "start new chat"
export const findUserByName = async (query: string): Promise<{ user_id: string; display_name: string | null }[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .ilike("display_name", `%${query}%`)
    .limit(10);
  if (error) throw error;
  return data || [];
};
