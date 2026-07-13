import { Search, Bell, LogOut, Settings, User as UserIcon, CheckCheck, Package, Sprout, MessageSquare, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts, useMarkAlertRead } from "@/hooks/useAlerts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import UserProfileModal from "@/components/search/UserProfileModal";
import ProductModal from "@/components/search/ProductModal";

const getInitials = (name?: string | null, email?: string | null) => {
  const source = name?.trim() || email?.split("@")[0] || "";
  if (!source) return "?";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const severityDot: Record<string, string> = {
  critical: "bg-destructive",
  warning: "bg-warning",
  info: "bg-primary",
  success: "bg-success",
};

const TopBar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = (user?.user_metadata as any)?.display_name as string | undefined;
  const initials = getInitials(displayName, user?.email);
  const { data: alerts } = useAlerts();
  const markRead = useMarkAlertRead();

  const unread = (alerts || []).filter((a) => !a.is_read);
  const unreadCount = unread.length;

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/auth");
  };

  const markAllRead = () => {
    unread.forEach((a) => markRead.mutate(a.id));
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-card border-b border-border lg:px-8">
      <div className="flex items-center gap-3 flex-1 max-w-md ml-10 lg:ml-0">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative p-2 rounded-full hover:bg-secondary transition-colors" aria-label="Notifications">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <p className="font-display font-bold text-sm">Notifications</p>
                <p className="text-xs text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {!alerts || alerts.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No notifications yet
                </div>
              ) : (
                alerts.slice(0, 20).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => !a.is_read && markRead.mutate(a.id)}
                    className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/50 transition flex gap-3 ${
                      !a.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        severityDot[a.severity?.toLowerCase()] || "bg-muted-foreground"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!a.is_read ? "font-medium" : "text-muted-foreground"}`}>
                        {a.message}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Profile */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-success flex items-center justify-center text-primary-foreground text-sm font-semibold shadow-sm hover:opacity-90 transition"
              title={displayName || user?.email || ""}
            >
              {initials}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-0 overflow-hidden">
            <div className="px-4 py-4 bg-gradient-to-br from-primary/10 to-success/10 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-success flex items-center justify-center text-primary-foreground text-sm font-semibold">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{displayName || "Farmer"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
            </div>
            <div className="py-2">
              <Link
                to="/profile"
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary"
              >
                <UserIcon className="w-4 h-4 text-muted-foreground" /> Profile
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary"
              >
                <Settings className="w-4 h-4 text-muted-foreground" /> Settings
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-destructive/10 text-destructive"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
};

export default TopBar;

type SearchResult = {
  id: string;
  kind: "product" | "user" | "crop" | "note";
  refId: string;
  title: string;
  subtitle?: string;
  to?: string;
  icon: JSX.Element;
};

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [userModal, setUserModal] = useState<string | null>(null);
  const [productModal, setProductModal] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const like = `%${term}%`;
      try {
        const [prod, users, crops, notes] = await Promise.all([
          supabase
            .from("marketplace_products")
            .select("id, name, category, price, price_unit")
            .or(`name.ilike.${like},description.ilike.${like},category.ilike.${like}`)
            .limit(6),
          supabase
            .from("profiles")
            .select("user_id, display_name, farm_name, location")
            .or(`display_name.ilike.${like},farm_name.ilike.${like},location.ilike.${like}`)
            .limit(6),
          supabase
            .from("crops")
            .select("id, name, stage, category")
            .ilike("name", like)
            .limit(5),
          supabase
            .from("farm_notes")
            .select("id, title, content")
            .or(`title.ilike.${like},content.ilike.${like}`)
            .limit(4),
        ]);

        if (cancelled) return;
        const merged: SearchResult[] = [];
        (users.data || []).forEach((u: any) =>
          merged.push({
            id: `u-${u.user_id}`,
            kind: "user",
            refId: u.user_id,
            title: u.display_name || "Farmer",
            subtitle: [u.farm_name, u.location].filter(Boolean).join(" · ") || "View profile",
            icon: <UserIcon className="w-4 h-4 text-primary" />,
          })
        );
        (prod.data || []).forEach((p: any) =>
          merged.push({
            id: `p-${p.id}`,
            kind: "product",
            refId: p.id,
            title: p.name,
            subtitle: `${p.category || "Product"} · $${p.price}/${p.price_unit || "unit"}`,
            icon: <Package className="w-4 h-4 text-accent" />,
          })
        );
        (crops.data || []).forEach((c: any) =>
          merged.push({
            id: `c-${c.id}`,
            kind: "crop",
            refId: c.id,
            title: c.name,
            subtitle: `${c.category || "Crop"} · ${c.stage || ""}`,
            to: "/crops",
            icon: <Sprout className="w-4 h-4 text-success" />,
          })
        );
        (notes.data || []).forEach((n: any) =>
          merged.push({
            id: `n-${n.id}`,
            kind: "note",
            refId: n.id,
            title: n.title || "Note",
            subtitle: (n.content || "").slice(0, 60),
            to: "/harvesting",
            icon: <MessageSquare className="w-4 h-4 text-muted-foreground" />,
          })
        );
        setResults(merged);
      } catch (e) {
        console.error("search error", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  const go = (r: SearchResult) => {
    setOpen(false);
    setQ("");
    if (r.kind === "user") setUserModal(r.refId);
    else if (r.kind === "product") setProductModal(r.refId);
    else if (r.to) navigate(r.to);
  };

  return (
    <>
      <div ref={wrapRef} className="relative w-full">
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-2.5 w-full">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search users, products, crops…"
            className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        </div>
        {open && q.trim().length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
            {results.length === 0 && !loading ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No results for "{q}"
              </div>
            ) : (
              results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => go(r)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition text-left border-b border-border last:border-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    {r.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    {r.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                    )}
                  </div>
                  <span className="text-[10px] uppercase text-muted-foreground tracking-wide">
                    {r.kind}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <UserProfileModal userId={userModal} onOpenChange={(o) => !o && setUserModal(null)} />
      <ProductModal productId={productModal} onOpenChange={(o) => !o && setProductModal(null)} />
    </>
  );
}
