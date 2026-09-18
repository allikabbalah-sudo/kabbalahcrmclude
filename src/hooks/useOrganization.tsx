import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuth } from "./useAuth";

export type MemberRole = "owner" | "admin" | "therapist" | "member" | "pending_approval";

interface OrgMembership {
  organizationId: string;
  organizationName: string;
  role: MemberRole;
}

interface OrganizationContextValue {
  memberships: OrgMembership[];
  activeOrgId: string | null;
  activeRole: MemberRole | null;
  isAdmin: boolean;
  setActiveOrgId: (id: string) => void;
  loading: boolean;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

const ACTIVE_ORG_STORAGE_KEY = "kabbalah-crm:active-org";

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ["organization-memberships", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<OrgMembership[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("organization_members")
        .select("organization_id, role, organizations(name)")
        .eq("user_id", user!.id)
        .neq("role", "pending_approval");
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        organizationId: row.organization_id,
        organizationName: row.organizations?.name ?? "Organization",
        role: row.role,
      }));
    },
  });

  useEffect(() => {
    if (memberships.length === 0) return;
    const stored = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_ORG_STORAGE_KEY) : null;
    const valid = memberships.find((m) => m.organizationId === stored);
    setActiveOrgIdState(valid?.organizationId ?? memberships[0].organizationId);
  }, [memberships]);

  const setActiveOrgId = (id: string) => {
    setActiveOrgIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, id);
  };

  const activeRole = useMemo(
    () => memberships.find((m) => m.organizationId === activeOrgId)?.role ?? null,
    [memberships, activeOrgId],
  );

  const value: OrganizationContextValue = {
    memberships,
    activeOrgId,
    activeRole,
    isAdmin: activeRole === "owner" || activeRole === "admin",
    setActiveOrgId,
    loading: isLoading,
  };

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error("useOrganization must be used within OrganizationProvider");
  return ctx;
}
