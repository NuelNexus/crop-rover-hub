import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useConversations,
  useThread,
  useSendMessage,
  findUserByName,
} from "@/hooks/useMessages";
import { MessageCircle, Send, Search, User, Plus, X } from "lucide-react";

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" });
};

const MessagesPage = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const activeId = params.get("to");

  const { data: conversations, isLoading } = useConversations();
  const { data: thread } = useThread(activeId || undefined);
  const send = useSendMessage();

  const [draft, setDraft] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [results, setResults] = useState<{ user_id: string; display_name: string | null }[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.length]);

  useEffect(() => {
    if (!searchQ.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const r = await findUserByName(searchQ.trim());
      setResults(r.filter((u) => u.user_id !== user?.id));
    }, 250);
    return () => clearTimeout(t);
  }, [searchQ, user?.id]);

  const handleSend = async () => {
    if (!draft.trim() || !activeId) return;
    await send.mutateAsync({ recipient_id: activeId, content: draft.trim() });
    setDraft("");
  };

  const activeConv = conversations?.find((c) => c.partner_id === activeId);

  return (
    <AppLayout>
      <div className="flex flex-col">
        <div className="mb-4">
          <h1 className="font-display text-3xl font-extrabold">Messages</h1>
          <p className="text-sm text-muted-foreground">Chat with sellers, buyers, and other farmers.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-180px)] min-h-[500px]">
          {/* Conversation list */}
          <aside className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border flex items-center gap-2">
              <h2 className="font-semibold text-sm flex-1">Conversations</h2>
              <button
                onClick={() => setShowNew(true)}
                className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
                title="New chat"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <p className="p-4 text-xs text-muted-foreground">Loading…</p>
              ) : !conversations || conversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No conversations yet.
                </div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.partner_id}
                    onClick={() => setParams({ to: c.partner_id })}
                    className={`w-full text-left px-3 py-3 border-b border-border hover:bg-secondary transition ${
                      activeId === c.partner_id ? "bg-secondary" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-sm">
                        {(c.partner_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{c.partner_name}</p>
                          {c.unread > 0 && (
                            <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
                              {c.unread}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{c.last_message}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* Thread */}
          <section className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
            {!activeId ? (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Select a conversation or start a new one.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-sm">
                    {(activeConv?.partner_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <p className="font-semibold text-sm">{activeConv?.partner_name || "Chat"}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-background/40">
                  {thread?.map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                            mine
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-secondary text-foreground rounded-bl-sm"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                          <p className={`text-[10px] mt-1 opacity-70 ${mine ? "text-primary-foreground" : ""}`}>
                            {formatTime(m.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
                <div className="p-3 border-t border-border flex items-center gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type a message…"
                    className="flex-1 border border-input bg-background rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!draft.trim() || send.isPending}
                    className="bg-primary text-primary-foreground p-2.5 rounded-xl hover:opacity-90 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {/* New chat modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Start new chat</h3>
              <button onClick={() => setShowNew(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                placeholder="Search by name…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="w-full border border-input bg-background rounded-xl pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {results.length === 0 && searchQ && (
                <p className="text-xs text-muted-foreground text-center py-6">No users found.</p>
              )}
              {results.map((r) => (
                <button
                  key={r.user_id}
                  onClick={() => { setParams({ to: r.user_id }); setShowNew(false); setSearchQ(""); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-sm">{r.display_name || r.user_id.slice(0, 8)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default MessagesPage;
