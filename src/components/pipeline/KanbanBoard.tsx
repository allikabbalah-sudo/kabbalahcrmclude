import { useState } from "react";
import { DndContext, DragOverlay, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { CLIENT_STATUS_LABELS_HE } from "@/lib/business-logic";
import { setClientStatus } from "@/lib/server-fns/clients";
import { useNavigate } from "@tanstack/react-router";

const COLUMNS = ["lead", "consultation", "active", "waiting", "paid", "inactive"] as const;

export function KanbanBoard({ clients }: { clients: any[] }) {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const grouped = COLUMNS.reduce<Record<string, any[]>>((acc, col) => {
    acc[col] = clients.filter((c) => c.status === col);
    return acc;
  }, {});

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as string;
    const client = clients.find((c) => c.id === active.id);
    if (!client || client.status === newStatus) return;

    await setClientStatus({ data: { id: client.id, status: newStatus as any } });
    queryClient.invalidateQueries({ queryKey: ["pipeline-clients"] });
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveId(e.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <Column key={col} id={col} label={CLIENT_STATUS_LABELS_HE[col]} clients={grouped[col]} />
        ))}
      </div>
      <DragOverlay>
        {activeId ? <CardPreview client={clients.find((c) => c.id === activeId)} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ id, label, clients }: { id: string; label: string; clients: any[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`w-64 shrink-0 rounded-lg border border-border p-2 ${isOver ? "bg-accent" : "bg-secondary/50"}`}
    >
      <div className="flex items-center justify-between px-1 py-1 mb-2">
        <h3 className="text-sm font-medium">{label}</h3>
        <span className="text-xs text-muted-foreground">{clients.length}</span>
      </div>
      <div className="space-y-2">
        {clients.map((c) => (
          <DraggableCard key={c.id} client={c} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ client }: { client: any }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: client.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={() => navigate({ to: "/clients/$id", params: { id: client.id } })}
      className="bg-card border border-border rounded-md p-2.5 text-sm cursor-grab active:cursor-grabbing"
    >
      <p className="font-medium truncate">{client.full_name}</p>
      {client.phone && <p className="text-xs text-muted-foreground truncate">{client.phone}</p>}
    </div>
  );
}

function CardPreview({ client }: { client?: any }) {
  if (!client) return null;
  return (
    <div className="bg-card border border-primary rounded-md p-2.5 text-sm shadow-lg w-56">
      <p className="font-medium">{client.full_name}</p>
    </div>
  );
}
