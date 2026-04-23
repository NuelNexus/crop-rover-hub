CREATE OR REPLACE FUNCTION public.device_heartbeat(_device_id uuid, _ip text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.esp32_devices
  SET is_online = true,
      last_seen = now(),
      ip_address = COALESCE(_ip, ip_address)
  WHERE id = _device_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.device_heartbeat(uuid, text) TO anon, authenticated;