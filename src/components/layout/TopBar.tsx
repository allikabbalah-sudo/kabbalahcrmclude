import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { ChevronDown, LogOut } from "lucide-react";

export function TopBar() {
  const { user, signOut } = useAuth();
  const { memberships, activeOrgId, setActiveOrgId } = useOrganization();
  const [open, setOpen] = useState(false);

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-sm font-medium"
        >
          {memberships.find((m) => m.organizationId === activeOrgId)?.organizationName ?? "בחר ארגון"}
          <ChevronDown size={14} />
        </button>
        {open && (
          <div className="absolute mt-2 w-56 rounded-md border border-border bg-popover shadow-md z-20">
            {memberships.map((m) => (
              <button
                key={m.organizationId}
                onClick={() => {
                  setActiveOrgId(m.organizationId);
                  setOpen(false);
                }}
                className="block w-full text-right px-3 py-2 text-sm hover:bg-secondary"
              >
                {m.organizationName}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
        <button
          onClick={() => signOut()}
          className="text-muted-foreground hover:text-foreground"
          aria-label="התנתק"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
