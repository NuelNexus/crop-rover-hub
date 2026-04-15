import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Order = {
  id: string;
  user_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  total_price: number;
  status: string;
  created_at: string;
};

export const useOrders = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
    enabled: !!user,
  });
};

export const usePlaceOrder = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (order: { product_id: string; product_name: string; quantity: number; total_price: number }) => {
      const { data, error } = await supabase
        .from("marketplace_orders")
        .insert({ ...order, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order placed successfully!");
    },
    onError: (e) => toast.error(e.message),
  });
};
