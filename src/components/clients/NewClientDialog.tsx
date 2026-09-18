import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { createClient } from "@/lib/server-fns/clients";
import { toast } from "sonner";

export function NewClientDialog({
  open,
  onOpenChange,
  organizationId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizationId: string;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSubmitting(true);
    try {
      await createClient({ data: { organizationId, fullName, phone, email } });
      toast.success("הלקוח נוצר בהצלחה");
      setFullName("");
      setPhone("");
      setEmail("");
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast.error(err?.message ?? "שגיאה ביצירת הלקוח");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-30" />
        <Dialog.Content
          dir="rtl"
          className="fixed z-40 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card border border-border rounded-lg p-5 shadow-lg"
        >
          <Dialog.Title className="font-semibold mb-4">לקוח חדש</Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              autoFocus
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="שם מלא *"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="טלפון"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              type="email"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-50"
              >
                צור לקוח
              </button>
              <Dialog.Close asChild>
                <button type="button" className="flex-1 rounded-md border border-input py-2 text-sm">
                  ביטול
                </button>
              </Dialog.Close>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
