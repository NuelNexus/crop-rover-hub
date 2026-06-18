import { useState, useRef, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Send, Loader2, ImagePlus, X, User, Mic, Plus, History, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";
import WalleAvatar from "@/components/avatars/WalleAvatar";
import SpeechToSpeech from "@/components/ai/SpeechToSpeech";

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
type Msg = { role: "user" | "assistant"; content: string | Part[]; display?: string; image?: string };
type ChatSession = { id: string; title: string; updatedAt: number; messages: Msg[] };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const STORAGE_KEY = "harvestiq.chats";

const loadSessions = (): ChatSession[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
};
const saveSessions = (s: ChatSession[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
};
const newSession = (): ChatSession => ({
  id: crypto.randomUUID(),
  title: "New chat",
  updatedAt: Date.now(),
  messages: [],
});

const AIAnalysisPage = () => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const s = loadSessions();
    return s.length ? s : [newSession()];
  });
  const [activeId, setActiveId] = useState<string>(() => {
    const s = loadSessions();
    return s[0]?.id || sessions[0]?.id;
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);

  const active = sessions.find((s) => s.id === activeId) || sessions[0];
  const messages = active?.messages || [];
  const setMessages = (updater: Msg[] | ((prev: Msg[]) => Msg[])) => {
    setSessions((prev) => {
      const next = prev.map((s) => {
        if (s.id !== activeId) return s;
        const newMsgs = typeof updater === "function" ? updater(s.messages) : updater;
        const firstUser = newMsgs.find((m) => m.role === "user");
        const title = firstUser?.display?.slice(0, 40) || firstUser && typeof firstUser.content === "string" ? (firstUser?.display || (typeof firstUser?.content === "string" ? firstUser.content : "Chat")).slice(0, 40) : s.title;
        return { ...s, messages: newMsgs, updatedAt: Date.now(), title };
      });
      saveSessions(next);
      return next;
    });
  };

  const [input, setInput] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => { inputRef.current?.focus(); }, [loading, activeId]);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) { toast({ title: "Please upload an image", variant: "destructive" }); return; }
    if (f.size > 8 * 1024 * 1024) { toast({ title: "Image too large (max 8MB)", variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(f);
  };

  const startNewChat = () => {
    const s = newSession();
    setSessions((prev) => {
      const next = [s, ...prev];
      saveSessions(next);
      return next;
    });
    setActiveId(s.id);
    setHistoryOpen(false);
  };

  const deleteChat = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      const final = next.length ? next : [newSession()];
      saveSessions(final);
      if (id === activeId) setActiveId(final[0].id);
      return final;
    });
  };

  const send = async () => {
    const text = input.trim();
    if (!text && !imageDataUrl) return;
    if (loading) return;

    const userDisplay = text || "(image attached)";
    const userMsg: Msg = imageDataUrl
      ? {
          role: "user",
          content: [
            { type: "text", text: text || "Please analyze this image. If it shows a plant or animal, describe it and check for pests/diseases." },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ] as Part[],
          display: userDisplay,
          image: imageDataUrl,
        }
      : { role: "user", content: text, display: userDisplay };

    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, { role: "assistant", content: "", display: "" }]);
    setInput("");
    setImageDataUrl(null);
    setLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
        body: JSON.stringify({ messages: newMessages.map((m) => ({ role: m.role, content: m.content })) }),
      });

      if (!res.ok) {
        if (res.status === 429) throw new Error("Rate limit reached. Try again shortly.");
        if (res.status === 402) throw new Error("AI credits exhausted.");
        throw new Error(`Request failed (${res.status})`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              assistantText += delta;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: assistantText, display: assistantText };
                return next;
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: `Error: ${e.message}`, display: `Error: ${e.message}` };
        return next;
      });
      toast({ title: "Chat error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const suggestions = [
    "What are common pests for tomato plants?",
    "How do I improve soil fertility naturally?",
    "When should I irrigate during flowering stage?",
    "Identify diseases in my crop (upload an image)",
  ];

  // For voice mode: serialize history as plain text turns
  const voiceHistory = messages
    .filter((m) => m.display || typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.display || (typeof m.content === "string" ? m.content : "") }));

  const addVoiceTurn = (turn: { role: "user" | "assistant"; content: string }) => {
    setMessages((prev) => [...prev, { role: turn.role, content: turn.content, display: turn.content }]);
  };

  return (
    <AppLayout>
      {voiceMode && (
        <SpeechToSpeech
          onExit={() => setVoiceMode(false)}
          history={voiceHistory}
          onTurn={addVoiceTurn}
        />
      )}
      <div className="flex flex-col h-[calc(100vh-7rem)]">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
            <WalleAvatar size={44} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold">AI Analysis Chat</h1>
            <p className="text-sm text-muted-foreground truncate">Ask about your crops · upload photos · talk in any language</p>
          </div>

          {/* Past chats dropdown */}
          <div className="relative">
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border hover:bg-secondary text-sm font-medium"
            >
              <History className="w-4 h-4" /> History
            </button>
            {historyOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setHistoryOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden">
                  <button
                    onClick={startNewChat}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-secondary border-b border-border"
                  >
                    <Plus className="w-4 h-4" /> New chat
                  </button>
                  <div className="max-h-80 overflow-y-auto">
                    {sessions.length === 0 && <p className="p-3 text-xs text-muted-foreground">No chats yet</p>}
                    {sessions.sort((a, b) => b.updatedAt - a.updatedAt).map((s) => (
                      <div key={s.id} className={`group flex items-center gap-2 px-3 py-2 hover:bg-secondary cursor-pointer ${s.id === activeId ? "bg-secondary" : ""}`}>
                        <button
                          onClick={() => { setActiveId(s.id); setHistoryOpen(false); }}
                          className="flex-1 text-left text-sm truncate"
                        >
                          <div className="truncate">{s.title || "Untitled"}</div>
                          <div className="text-[10px] text-muted-foreground">{new Date(s.updatedAt).toLocaleString()}</div>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteChat(s.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setVoiceMode(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-success text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Mic className="w-4 h-4" /> Speech to Speech
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto stat-card !p-4 space-y-4 mb-3">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-4 overflow-hidden">
                <WalleAvatar size={72} />
              </div>
              <h2 className="font-display text-xl font-semibold mb-2">How can I help your farm today?</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Ask agronomy questions, upload a photo, or tap Speech to Speech to talk hands-free.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl w-full">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => setInput(s)} className="text-left text-sm p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors">{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <WalleAvatar size={34} />
                </div>
              )}
              <div className={`max-w-[80%] ${m.role === "user" ? "order-2" : ""}`}>
                {m.image && <img src={m.image} alt="upload" className="rounded-xl mb-2 max-h-64 border border-border" />}
                {m.role === "user" ? (
                  <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-2.5 text-sm">{m.display}</div>
                ) : (
                  <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-headings:font-display">
                    {m.display ? <ReactMarkdown>{m.display}</ReactMarkdown> : (
                      <span className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...</span>
                    )}
                  </div>
                )}
              </div>
              {m.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 order-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="stat-card !p-3">
          {imageDataUrl && (
            <div className="relative inline-block mb-2">
              <img src={imageDataUrl} alt="preview" className="h-20 rounded-lg border border-border" />
              <button onClick={() => setImageDataUrl(null)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="gemini">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <div className="inner">
              <button type="button" onClick={() => fileRef.current?.click()} className="gemini-btn" title="Upload image">
                <ImagePlus className="w-5 h-5" />
              </button>
              <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} placeholder="Ask Clucky" className="gemini-input" autoFocus />
              <button type="button" onClick={send} disabled={loading || (!input.trim() && !imageDataUrl)} className="gemini-btn" title="Send">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
            <div className="border"></div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AIAnalysisPage;
