import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Users, KanbanSquare, Calendar, CheckSquare, Bell, Settings } from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard", label: "לוח בקרה", icon: LayoutDashboard },
  { to: "/clients", label: "לקוחות", icon: Users },
  { to: "/pipeline", label: "צינור מכירות", icon: KanbanSquare },
  { to: "/calendar", label: "יומן", icon: Calendar },
  { to: "/tasks", label: "משימות", icon: CheckSquare },
  { to: "/notifications", label: "התראות", icon: Bell },
  { to: "/settings", label: "הגדרות", icon: Settings },
] as const;

export function SidebarNav() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-l border-sidebar-border bg-sidebar">
      <div className="h-14 flex items-center px-4 font-semibold text-sidebar-foreground">
        Kabbalah CRM
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground"
            activeOptions={{ exact: false }}
            activeProps={{ className: "active" }}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
