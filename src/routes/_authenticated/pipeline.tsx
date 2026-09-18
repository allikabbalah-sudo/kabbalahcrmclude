import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useOrganization } from "@/hooks/useOrganization";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";

export const Route = createFileRoute("/_authenticated/pipeline")({
  component: PipelinePage,
});

function PipelinePage() {
  const { activeOrgId } = useOrganization();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["pipeline-clients", activeOrgId],
    enabled: !!activeOrgId,
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, phone, status")
        .eq("organization_id", activeOrgId!);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-lg font-semibold mb-4">צינור מכירות</h1>
      {isLoading ? <p className="text-muted-foreground text-sm">טוען...</p> : <KanbanBoard clients={clients} />}
    </div>
  );
}
