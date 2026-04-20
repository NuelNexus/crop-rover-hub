import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CameraCapture = {
  id: string;
  device_id: string;
  image_url: string;
  ai_analysis: string | null;
  detected_issue: string | null;
  severity: string;
  location: string | null;
  analyzed: boolean;
  created_at: string;
};

export const useCameraCaptures = (deviceId?: string) => {
  return useQuery({
    queryKey: ["camera_captures", deviceId],
    queryFn: async () => {
      let q = supabase
        .from("esp32_camera_captures")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (deviceId) q = q.eq("device_id", deviceId);
      const { data, error } = await q;
      if (error) throw error;
      return data as CameraCapture[];
    },
    refetchInterval: 8000,
  });
};

export const useRealtimeCaptures = (deviceId?: string) => {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`captures-${deviceId || "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "esp32_camera_captures" },
        () => qc.invalidateQueries({ queryKey: ["camera_captures"] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceId, qc]);
};

export const useUploadAndAnalyze = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, deviceId, location }: { file: File; deviceId: string; location?: string }) => {
      const path = `${deviceId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("crop-cam").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("crop-cam").getPublicUrl(path);
      const image_url = pub.publicUrl;

      const { data: cap, error } = await supabase
        .from("esp32_camera_captures")
        .insert({ device_id: deviceId, image_url, location })
        .select()
        .single();
      if (error) throw error;

      // Trigger AI analysis (fire and forget then refresh)
      await supabase.functions.invoke("analyze-cam-image", {
        body: { image_url, capture_id: cap.id },
      });
      return cap;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camera_captures"] });
      toast.success("Image analyzed by AI");
    },
    onError: (e: any) => toast.error(e.message || "Upload failed"),
  });
};

export const useAnalyzeCapture = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (capture: CameraCapture) => {
      const { error } = await supabase.functions.invoke("analyze-cam-image", {
        body: { image_url: capture.image_url, capture_id: capture.id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camera_captures"] });
      toast.success("Analysis complete");
    },
    onError: (e: any) => toast.error(e.message || "Analysis failed"),
  });
};

export const useDeleteCapture = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("esp32_camera_captures").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["camera_captures"] }),
  });
};
