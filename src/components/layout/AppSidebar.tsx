import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  LayoutDashboard,
  BarChart3,
  Sprout,
  Tractor,
  DollarSign,
  CloudSun,
  Settings,
  LogOut,
  Bot,
  Warehouse,
  ShoppingCart,
  FileSearch,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Home", path: "/" },
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Sprout, label: "Crops", path: "/crops" },
  { icon: Bot, label: "CropRover", path: "/croprover" },
  { icon: Warehouse, label: "Storage", path: "/storage" },
  { icon: Tractor, label: "Harvesting", path: "/harvesting" },
  { icon: DollarSign, label: "Finances", path: "/finances" },
  { icon: ShoppingCart, label: "Marketplace", path: "/marketplace" },
  { icon: FileSearch, label: "Traceability", path: "/traceability" },
  { icon: CloudSun, label: "Weather", path: "/weather" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const AppSidebar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="px-6 py-6">
        <div className="flex items-center gap-2">
          <Sprout className="w-7 h-7 text-sidebar-primary" />
          <span className="font-display text-xl font-bold tracking-tight">
            agri<span className="text-sidebar-primary">Cultur</span>
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "sidebar-active"
                  : "hover:bg-sidebar-accent"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-6">
        <button className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-sidebar-accent w-full transition-colors text-sidebar-foreground">
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg shadow-md border border-border"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-foreground/30 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-40 w-64 transform transition-transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 min-h-screen flex-shrink-0">
        <div className="fixed w-64 h-screen overflow-y-auto">
          {sidebar}
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
