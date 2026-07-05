import { useEffect, useRef, useState, useCallback } from "react";
import { MessageSquare, Mic, MicOff, Loader2, X, Play, Volume2 } from "lucide-react";
import "@/styles/orb.css";
import { useLanguage } from "@/i18n/LanguageProvider";
import { LANGUAGES } from "@/i18n/languages";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Turn = { role: "user" | "assistant"; content: string };

type Props = {
  onExit: () => void;
  history: Turn[];
  onTurn: (turn: Turn) => void;
};

type Phase = "idle" | "listening" | "thinking" | "speaking";

// Curated ElevenLabs voices (all multilingual)
const VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah — warm female" },
  { id: "9BWtsMINqrJLrRacOk9x", name: "Aria — expressive female" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte — soft female" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda — friendly female" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica — confident female" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George — mature male" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel — british male" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam — youthful male" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian — deep male" },
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris — casual male" },
  { id: "cjVigY5qzO86Huf0OWal", name: "Eric — smooth male" },
  { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum — intense male" },
];

const VOICE_STORAGE_KEY = "harvestiq.voiceId";

const SpeechToSpeech = ({ onExit, history, onTurn }: Props) => {
  const { lang } = useLanguage();
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [voiceId, setVoiceId] = useState<string>(
    () => localStorage.getItem(VOICE_STORAGE_KEY) || VOICES[0].id
  );
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef(history);
  historyRef.current = history;

  const langName = LANGUAGES.find((l) => l.code === lang)?.name || "English";

  useEffect(() => {
    localStorage.setItem(VOICE_STORAGE_KEY, voiceId);
  }, [voiceId]);

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
    if (pendingAudioUrl) {
      URL.revokeObjectURL(pendingAudioUrl);
    }
  }, [pendingAudioUrl]);

  useEffect(() => () => cleanup(), [cleanup]);

  const playAudio = async (audio: HTMLAudioElement, url: string) => {
    setPhase("speaking");
    try {
      await audio.play();
      setPendingAudioUrl(null);
    } catch (err: any) {
      // Autoplay blocked — show manual play button
      console.warn("Autoplay blocked", err);
      setPendingAudioUrl(url);
      setPhase("idle");
    }
  };

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
        body: JSON.stringify({ text, voiceId }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`TTS ${res.status}: ${errText.slice(0, 200)}`);
      }
      const blob = await res.blob();
      if (blob.size < 500) throw new Error("Empty audio returned");
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPhase("idle");
        audioRef.current = null;
      };
      audio.onerror = () => {
        setError("Audio playback failed");
        setPhase("idle");
      };
      audioRef.current = audio;
      await playAudio(audio, url);
    } catch (e: any) {
      console.error("TTS failed", e);
      setError(e.message);
      toast({ title: "Voice playback failed", description: e.message, variant: "destructive" });
      setPhase("idle");
    }
  };

  const manualPlayPending = async () => {
    if (!audioRef.current || !pendingAudioUrl) return;
    try {
      await audioRef.current.play();
      setPhase("speaking");
      setPendingAudioUrl(null);
    } catch (e: any) {
      toast({ title: "Cannot play audio", description: e.message, variant: "destructive" });
    }
  };

  const handleAudio = async (blob: Blob) => {
    setPhase("thinking");
    setError(null);
    try {
      const fd = new FormData();
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      fd.append("file", blob, `speech.${ext}`);
      const sttRes = await fetch(`${SUPABASE_URL}/functions/v1/speech-to-text`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
        body: fd,
      });
      if (!sttRes.ok) {
        const t = await sttRes.text().catch(() => "");
        throw new Error(`Transcription failed (${sttRes.status}): ${t.slice(0, 200)}`);
      }
      const { text } = await sttRes.json();
      if (!text?.trim()) {
        toast({ title: "Didn't catch that", description: "Try speaking a bit louder." });
        setPhase("idle");
        return;
      }
      setTranscript(text);
      const userTurn: Turn = { role: "user", content: text };
      onTurn(userTurn);

      const messages = [...historyRef.current, userTurn].map((t) => ({
        role: t.role,
        content: t.content,
      }));
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
              content: `You are Harvest IQ AI in voice mode. Always reply in ${langName} (code: ${lang}). Keep responses conversational, warm, and concise (2-4 sentences). No markdown, no bullet lists — natural spoken prose only.`,
            },
            ...messages,
          ],
        }),
      });
      if (!chatRes.ok) {
        const t = await chatRes.text().catch(() => "");
        throw new Error(`AI chat failed (${chatRes.status}): ${t.slice(0, 200)}`);
      }
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
        setError("No response from AI");
        setPhase("idle");
      }
    } catch (e: any) {
      console.error("Voice pipeline error", e);
      setError(e.message);
      toast({ title: "Voice error", description: e.message, variant: "destructive" });
      setPhase("idle");
    }
  };

  const startListening = async () => {
    try {
      setError(null);
      if (phase === "speaking" && audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setTranscript("");
      setReply("");
      setPendingAudioUrl(null);
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
        else {
          toast({ title: "Recording too short", description: "Hold to talk a bit longer." });
          setPhase("idle");
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setPhase("listening");
    } catch (e: any) {
      setError(e.message);
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

      {/* Voice picker */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl px-3 py-2">
        <Volume2 className="w-4 h-4 text-white/80" />
        <Select value={voiceId} onValueChange={setVoiceId}>
          <SelectTrigger className="w-64 bg-transparent border-0 text-white text-sm h-8 focus:ring-0">
            <SelectValue placeholder="Select voice" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {VOICES.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-6 mt-16">
        <div className={`orb ${orbClass}`} />
        <p className="text-white/90 text-lg font-medium">{statusLabel}</p>
        {transcript && (
          <p className="text-sm text-white/70 italic text-center max-w-lg">"{transcript}"</p>
        )}
        {reply && (
          <p className="text-base text-white/95 text-center max-w-xl leading-relaxed">{reply}</p>
        )}
        {error && (
          <p className="text-xs text-red-300 text-center max-w-lg">{error}</p>
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
          ) : pendingAudioUrl ? (
            <button
              onClick={manualPlayPending}
              className="w-16 h-16 rounded-full bg-white text-black hover:scale-105 transition flex items-center justify-center shadow-xl"
              title="Tap to play (autoplay blocked)"
            >
              <Play className="w-7 h-7" />
            </button>
          ) : (
            <button
              onClick={startListening}
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
