import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Product = {
  id: string;
  name: string;
  price: number;
  price_unit: string;
  seller: string;
  rating: number | null;
  stock_status: string;
  category: string | null;
  description: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export const useProducts = () =>
  useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("marketplace_products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

export const useAddProduct = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (product: Omit<Product, "id" | "created_at" | "updated_at" | "user_id">) => {
      const { data, error } = await supabase.from("marketplace_products").insert({ ...product, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Product listed"); },
    onError: (e) => toast.error(e.message),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketplace_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Product removed"); },
    onError: (e) => toast.error(e.message),
  });
};
