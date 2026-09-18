import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { CLIENT_STATUS_LABELS_HE, formatSessionDateHe, toWhatsAppUrl } from "@/lib/business-logic";
import { setClientStatus } from "@/lib/server-fns/clients";
import { ProgramCard } from "@/components/clients/ProgramCard";
import { MessageCircle, Phone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  component: ClientDetailPage,
});

function ClientDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["client-programs", id],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("programs")
        .select("*, sessions(*)")
        .eq("client_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !client) return <div className="p-6 text-muted-foreground">טוען...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{client.full_name}</h1>
          <select
            value={client.status}
            onChange={async (e) => {
              await setClientStatus({ data: { id: client.id, status: e.target.value as any } });
              queryClient.invalidateQueries({ queryKey: ["client", id] });
            }}
            className="mt-1 text-sm rounded-md border border-input bg-background px-2 py-1"
          >
            {Object.entries(CLIENT_STATUS_LABELS_HE).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {client.phone && (
          <div className="flex gap-2 shrink-0">
            <a
              href={toWhatsAppUrl(client.phone)}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-success/15 text-success p-2"
              aria-label="שלח וואטסאפ"
            >
              <MessageCircle size={18} />
            </a>
            <a href={`tel:${client.phone}`} className="rounded-md bg-secondary p-2" aria-label="התקשר">
              <Phone size={18} />
            </a>
          </div>
        )}
      </div>

      <section className="bg-card border border-border rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
        <Field label="טלפון" value={client.phone} />
        <Field label="אימייל" value={client.email} />
        <Field label="תאריך לידה" value={client.date_of_birth} />
        <Field label="שם האם" value={client.mother_name} />
        <Field label="קריאה נבחרת" value={client.selected_reading} />
        <Field label="כתובת" value={client.address} />
      </section>

      {client.notes && (
        <section className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-medium mb-2 text-sm">הערות</h2>
          <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
        </section>
      )}

      <section>
        <h2 className="font-medium mb-3">תוכניות טיפול</h2>
        {programs.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין תוכניות עדיין</p>
        ) : (
          <div className="space-y-3">
            {programs.map((p: any) => (
              <ProgramCard key={p.id} program={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p>{value}</p>
    </div>
  );
}
