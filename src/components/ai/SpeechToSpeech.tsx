import { useEffect, useRef, useState, useCallback } from "react";
import { MessageSquare, Mic, MicOff, Loader2, X } from "lucide-react";
import "@/styles/orb.css";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageProvider";
import { LANGUAGES } from "@/i18n/languages";
import { toast } from "@/hooks/use-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Turn = { role: "user" | "assistant"; content: string };

type Props = {
  onExit: () => void;
  history: Turn[];
  onTurn: (turn: Turn) => void;
};

type Phase = "idle" | "listening" | "thinking" | "speaking";

const SpeechToSpeech = ({ onExit, history, onTurn }: Props) => {
  const { lang } = useLanguage();
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef(history);
  historyRef.current = history;

  const langName = LANGUAGES.find((l) => l.code === lang)?.name || "English";

  const stopMic = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const cleanup = useCallback(() => {
    stopMic();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const speak = async (text: string) => {
    setPhase("speaking");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/text-to-speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify({
          text,
          voice: "alloy",
          instructions: `Speak naturally and warmly in ${langName}. Conversational pacing.`,
        }),
      });
      if (!res.ok) throw new Error(`TTS ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPhase("idle");
      };
      audio.onerror = () => setPhase("idle");
      await audio.play();
    } catch (e: any) {
      toast({ title: "Voice playback failed", description: e.message, variant: "destructive" });
      setPhase("idle");
    }
  };

  const handleAudio = async (blob: Blob) => {
    setPhase("thinking");
    try {
      const fd = new FormData();
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      fd.append("file", blob, `speech.${ext}`);
      const sttRes = await fetch(`${SUPABASE_URL}/functions/v1/speech-to-text`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
        body: fd,
      });
      if (!sttRes.ok) throw new Error(`STT ${sttRes.status}`);
      const { text } = await sttRes.json();
      if (!text?.trim()) {
        setPhase("idle");
        return;
      }
      setTranscript(text);
      const userTurn: Turn = { role: "user", content: text };
      onTurn(userTurn);

      // Stream chat
      const messages = [...historyRef.current, userTurn].map((t) => ({ role: t.role, content: t.content }));
      const chatRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are Harvest IQ AI in voice mode. Always reply in ${langName} (language code: ${lang}). Keep responses conversational, warm, and concise (2-4 sentences). No markdown, no bullet lists — only natural spoken prose.`,
            },
            ...messages,
          ],
        }),
      });
      if (!chatRes.ok) throw new Error(`Chat ${chatRes.status}`);
      const reader = chatRes.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const j = JSON.parse(data);
            const d = j.choices?.[0]?.delta?.content;
            if (d) {
              full += d;
              setReply(full);
            }
          } catch {}
        }
      }
      if (full.trim()) {
        onTurn({ role: "assistant", content: full });
        await speak(full);
      } else {
        setPhase("idle");
      }
    } catch (e: any) {
      toast({ title: "Voice error", description: e.message, variant: "destructive" });
      setPhase("idle");
    }
  };

  const startListening = async () => {
    try {
      if (phase === "speaking" && audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setTranscript("");
      setReply("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        stopMic();
        if (blob.size > 1000) handleAudio(blob);
        else setPhase("idle");
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setPhase("listening");
    } catch (e: any) {
      toast({ title: "Mic blocked", description: e.message, variant: "destructive" });
    }
  };

  const stopListening = () => {
    mediaRecorderRef.current?.stop();
  };

  const handleExit = () => {
    cleanup();
    onExit();
  };

  const orbClass = phase === "listening" ? "listening" : phase === "speaking" ? "speaking" : "";
  const statusLabel =
    phase === "listening" ? "Listening…" :
    phase === "thinking" ? "Thinking…" :
    phase === "speaking" ? "Speaking…" : "Tap the mic to talk";

  return (
    <div className="sts-stage fixed inset-0 z-50 flex flex-col items-center justify-center text-white">
      <button
        onClick={handleExit}
        className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur text-sm font-medium"
      >
        <MessageSquare className="w-4 h-4" /> Back to Chat
      </button>
      <button
        onClick={handleExit}
        className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-6">
        <div className={`orb ${orbClass}`} />
        <p className="text-white/90 text-lg font-medium">{statusLabel}</p>
        {transcript && (
          <p className="text-sm text-white/70 italic text-center max-w-lg">"{transcript}"</p>
        )}
        {reply && (
          <p className="text-base text-white/95 text-center max-w-xl leading-relaxed">{reply}</p>
        )}

        <div className="flex items-center gap-4 mt-4">
          {phase === "listening" ? (
            <button
              onClick={stopListening}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-xl animate-pulse"
            >
              <MicOff className="w-7 h-7" />
            </button>
          ) : phase === "thinking" ? (
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
          ) : (
            <button
              onClick={startListening}
              disabled={phase === "speaking" && false}
              className="w-16 h-16 rounded-full bg-white text-black hover:scale-105 transition flex items-center justify-center shadow-xl"
            >
              <Mic className="w-7 h-7" />
            </button>
          )}
        </div>
        <p className="text-xs text-white/50">Replying in {langName} · {history.length} turns remembered</p>
      </div>
    </div>
  );
};

export default SpeechToSpeech;
