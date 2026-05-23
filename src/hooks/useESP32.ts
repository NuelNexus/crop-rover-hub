import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ESP32Device = {
  id: string;
  user_id: string;
  device_name: string;
  device_type: string;
  ip_address: string | null;
  api_key: string;
  is_online: boolean;
  last_seen: string | null;
  created_at: string;
};

export type SensorReading = {
  id: string;
  device_id: string;
  sensor_type: string;
  value: number;
  unit: string;
  created_at: string;
};

export const useDevices = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["esp32_devices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("esp32_devices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ESP32Device[];
    },
    enabled: !!user,
    refetchInterval: 5000,
  });
};

export const useAddDevice = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (device: { device_name: string; device_type: string; ip_address?: string }) => {
      const { data, error } = await supabase
        .from("esp32_devices")
        .insert({ ...device, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["esp32_devices"] });
      toast.success("Device added");
    },
    onError: (e) => toast.error(e.message),
  });
};

export const useDeleteDevice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("esp32_devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["esp32_devices"] });
      toast.success("Device removed");
    },
    onError: (e) => toast.error(e.message),
  });
};

export const useSensorReadings = (deviceId?: string) => {
  return useQuery({
    queryKey: ["sensor_readings", deviceId],
    queryFn: async () => {
      let query = supabase
        .from("esp32_sensor_readings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (deviceId) query = query.eq("device_id", deviceId);
      const { data, error } = await query;
      if (error) throw error;
      return data as SensorReading[];
    },
    enabled: !!deviceId,
    refetchInterval: 5000,
  });
};

export const useRealtimeSensorReadings = (deviceId?: string) => {
  const qc = useQueryClient();

  useEffect(() => {
    if (!deviceId) return;

    const channel = supabase
      .channel(`sensor-${deviceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "esp32_sensor_readings",
          filter: `device_id=eq.${deviceId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["sensor_readings", deviceId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceId, qc]);
};

// Arduino sketches are served as static files from /public/arduino/*.ino
// (see src/pages/ESP32Page.tsx -> sketchPathByType).

