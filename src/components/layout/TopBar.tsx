import { Search, Bell } from "lucide-react";

const TopBar = () => {
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
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
          JD
        </div>
      </div>
    </header>
  );
};

export default TopBar;
