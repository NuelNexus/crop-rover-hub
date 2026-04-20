import { Search, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const getInitials = (name?: string | null, email?: string | null) => {
  const source = name?.trim() || email?.split("@")[0] || "";
  if (!source) return "?";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const TopBar = () => {
  const { user } = useAuth();
  const displayName = (user?.user_metadata as any)?.display_name as string | undefined;
  const initials = getInitials(displayName, user?.email);

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
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-full hover:bg-secondary transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </button>
        <div
          className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-success flex items-center justify-center text-primary-foreground text-sm font-semibold shadow-sm"
          title={displayName || user?.email || ""}
        >
          {initials}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
