import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useOrganization } from "@/hooks/useOrganization";
import { CLIENT_STATUS_LABELS_HE } from "@/lib/business-logic";
import { ClientCard } from "@/components/clients/ClientCard";
import { Plus, Search } from "lucide-react";
import { NewClientDialog } from "@/components/clients/NewClientDialog";

export const Route = createFileRoute("/_authenticated/clients/")({
  component: ClientsListPage,
});

function ClientsListPage() {
  const { activeOrgId } = useOrganization();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [showNew, setShowNew] = useState(false);

  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ["clients", activeOrgId, search, status],
    enabled: !!activeOrgId,
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      let query = supabase
        .from("clients")
        .select("*")
        .eq("organization_id", activeOrgId!)
        .order("updated_at", { ascending: false });

      if (status !== "all") query = query.eq("status", status);
      if (search.trim()) query = query.ilike("full_name", `%${search.trim()}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold">לקוחות</h1>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium"
        >
          <Plus size={16} /> לקוח חדש
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם..."
            className="w-full rounded-md border border-input bg-background py-2 pr-9 pl-3 text-sm"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">כל הסטטוסים</option>
          {Object.entries(CLIENT_STATUS_LABELS_HE).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">טוען...</p>
      ) : clients.length === 0 ? (
        <p className="text-muted-foreground text-sm">לא נמצאו לקוחות</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {clients.map((c: any) => (
            <Link key={c.id} to="/clients/$id" params={{ id: c.id }}>
              <ClientCard client={c} />
            </Link>
          ))}
        </div>
      )}

      <NewClientDialog
        open={showNew}
        onOpenChange={setShowNew}
        organizationId={activeOrgId!}
        onCreated={() => refetch()}
      />
    </div>
  );
}
