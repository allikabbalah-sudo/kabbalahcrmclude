import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Users, Calendar, CheckSquare, Bell } from "lucide-react";

const ITEMS = [
  { to: "/dashboard", label: "בית", icon: LayoutDashboard },
  { to: "/clients", label: "לקוחות", icon: Users },
  { to: "/calendar", label: "יומן", icon: Calendar },
  { to: "/tasks", label: "משימות", icon: CheckSquare },
  { to: "/notifications", label: "התראות", icon: Bell },
] as const;

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-card border-t border-border flex items-center justify-around z-10">
      {ITEMS.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex flex-col items-center gap-0.5 text-[11px] text-muted-foreground [&.active]:text-primary"
          activeProps={{ className: "active" }}
        >
          <Icon size={20} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
