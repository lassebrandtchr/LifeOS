"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { connectNotion } from "@/features/integrations/actions";

/**
 * NotionConnectDialog – "Forbind"-knap + lille pop-op, hvor Lasse indsætter sin
 * interne Notion-integration-token. Validerer mod Notion via en Server Action.
 */
export function NotionConnectDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [token, setToken] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function submit() {
    if (!token.trim()) {
      toast.error("Indsæt din Notion-nøgle.");
      return;
    }
    startTransition(async () => {
      const res = await connectNotion(token);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Notion er forbundet 🎉");
        setOpen(false);
        setToken("");
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="shrink-0">
        Forbind
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <motion.div
              className="w-full max-w-md rounded-card border border-border/70 bg-card shadow-soft-lg"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
            >
              <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl border border-border/60 bg-white shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/connectors/notion.svg" alt="" className="size-5" />
                  </span>
                  <h2 className="text-lg font-semibold">Forbind Notion</h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Luk"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-3 px-6 py-5">
                <p className="text-sm text-muted-foreground">
                  Indsæt din <strong>Internal Integration Secret</strong> fra
                  Notion (starter typisk med <code className="rounded bg-secondary px-1 py-0.5 text-xs">ntn_</code> eller{" "}
                  <code className="rounded bg-secondary px-1 py-0.5 text-xs">secret_</code>).
                </p>
                <Input
                  type="password"
                  autoFocus
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ntn_…"
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
                <p className="text-xs text-muted-foreground">
                  Husk at dele de sider, du vil have med, med din integration inde
                  i Notion (••• → Forbindelser).
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t border-border/60 px-6 py-4">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                  Annullér
                </Button>
                <Button onClick={submit} disabled={pending}>
                  {pending ? "Forbinder …" : "Forbind"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
