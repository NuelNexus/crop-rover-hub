import { useState } from "react";
import { Camera, ExternalLink, WifiOff } from "lucide-react";

type Props = {
  ip: string | null;
  isOnline: boolean;
  className?: string;
};

const buildStreamUrl = (ip: string) => `http://${ip}:81/stream`;

const CameraStream = ({ ip, isOnline, className = "" }: Props) => {
  const [errored, setErrored] = useState(false);

  if (!ip) {
    return (
      <div className={`relative bg-secondary rounded-xl aspect-video flex flex-col items-center justify-center text-muted-foreground ${className}`}>
        <WifiOff className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-xs">Camera IP unknown — power on the ESP32-CAM</p>
      </div>
    );
  }

  const url = buildStreamUrl(ip);
  const insecureContext = typeof window !== "undefined" && window.location.protocol === "https:";

  return (
    <div className={`relative bg-black rounded-xl overflow-hidden aspect-video ${className}`}>
      {!errored && !insecureContext ? (
        <img
          src={url}
          alt="Live camera stream"
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 p-4 text-center">
          <Camera className="w-10 h-10 mb-2 opacity-70" />
          <p className="text-sm font-medium">Live stream available</p>
          <p className="text-[11px] opacity-70 mb-3">
            Browsers block HTTP video inside HTTPS pages. Open the stream in a new tab.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-md text-xs font-medium"
          >
            <ExternalLink className="w-3 h-3" /> Open {url}
          </a>
        </div>
      )}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded">
        <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-red-500 animate-pulse" : "bg-gray-400"}`} />
        {isOnline ? "LIVE" : "OFFLINE"}
      </div>
    </div>
  );
};

export default CameraStream;
