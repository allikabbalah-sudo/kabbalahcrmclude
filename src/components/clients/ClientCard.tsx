import { CLIENT_STATUS_LABELS_HE } from "@/lib/business-logic";

const STATUS_STYLES: Record<string, string> = {
  lead: "bg-muted text-muted-foreground",
  consultation: "bg-accent text-accent-foreground",
  active: "bg-success/15 text-success",
  inactive: "bg-muted text-muted-foreground",
  waiting: "bg-warning/15 text-warning",
  paid: "bg-primary/15 text-primary",
};

export function ClientCard({ client }: { client: any }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-sm font-medium shrink-0">
            {client.full_name?.[0] ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{client.full_name}</p>
            {client.phone && <p className="text-xs text-muted-foreground truncate">{client.phone}</p>}
          </div>
        </div>
        <span
          className={`text-xs rounded-full px-2 py-0.5 shrink-0 ${STATUS_STYLES[client.status] ?? ""}`}
        >
          {CLIENT_STATUS_LABELS_HE[client.status] ?? client.status}
        </span>
      </div>
    </div>
  );
}
