import { Search, Bell, LogOut, Settings, User as UserIcon, CheckCheck } from "lucide-react";
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
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-2.5 w-full">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search any of content"
            className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground"
          />
        </div>
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
