"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { Zap, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { SectionCard } from "@/components/dashboard/section-card";
import { TextScratchpad } from "@/components/dashboard/text-scratchpad";
import { quickCreateTask } from "@/features/tasks/actions";
import { useOpenDetail } from "@/components/tasks/detail-context";
import type { Workspace, Priority, Status } from "@/features/tasks/constants";

/**
 * Hurtige handlinger til undersiderne (Storgaard / Privat).
 *
 * Tre slags handlinger:
 *  • navigate    – gå til en side.
 *  • create-task – opret en opgave (evt. med note/prioritet) og åbn editoren.
 *  • new-event   – åbn "Ny begivenhed" forudfyldt (i den valgte verden).
 */
export type QuickAction =
  | { kind: "navigate"; label: string; icon: LucideIcon; color: string; href: string }
  | {
      kind: "create-task";
      label: string;
      icon: LucideIcon;
      color: string;
      title: string;
      workspace: Workspace;
      priority?: Priority;
      status?: Status;
      category?: string;
      note?: string;
    }
  | {
      kind: "new-event";
      label: string;
      icon: LucideIcon;
      color: string;
      title?: string;
      workspace: Workspace;
    };

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

export function PageQuickActions({
  actions,
  scratchpad = false,
}: {
  actions: QuickAction[];
  /** Vis "tekst med fed skrift."-knappen i headeren (kun forside + Storgaard). */
  scratchpad?: boolean;
}) {
  const router = useRouter();
  const { open } = useOpenDetail();
  const [pending, setPending] = React.useState<string | null>(null);

  function run(action: QuickAction) {
    if (pending) return;

    if (action.kind === "navigate") {
      router.push(action.href);
      return;
    }

    if (action.kind === "new-event") {
      const params = new URLSearchParams({
        ny: action.title ?? "",
        verden: action.workspace,
      });
      router.push(`/kalender?${params.toString()}`);
      return;
    }

    // create-task → opret og åbn editoren for den nye opgave i en kasse midt
    // på SIDEN (samme redigerings-modal som ellers bruges til at redigere
    // opgaver), uden at navigere væk fra forsiden/Storgaard/Privat.
    setPending(action.label);
    (async () => {
      try {
        // Kapløb med en klient-timeout: hvis serveren skulle hænge (fx et
        // langsomt auth-/DB-kald uden egen timeout), frigives knapperne alligevel
        // efter 12 s i stedet for at være døde for evigt.
        const res = await Promise.race([
          quickCreateTask({
            title: action.title,
            workspace: action.workspace,
            priority: action.priority,
            status: action.status,
            category: action.category ?? null,
            note: action.note ?? null,
          }),
          new Promise<Awaited<ReturnType<typeof quickCreateTask>>>((resolve) =>
            setTimeout(
              () => resolve({ error: "Oprettelsen tog for lang tid – prøv igen." }),
              12000,
            ),
          ),
        ]);
        if (res?.error || !res?.task) {
          toast.error(res?.error ?? "Kunne ikke oprette opgaven.");
          return;
        }
        // Åbn editoren FØR refresh, så den vises med det samme (router.refresh
        // kører i en transition og må ikke udskyde/sluge åbningen).
        // autoClassify: opgaven er nyoprettet med en foreløbig titel – lad
        // editoren udlede prioritet + kategori automatisk af Emne-teksten
        // (samme motor som Opgaver-siden), efterhånden som Lasse skriver.
        open({ type: "task", task: res.task, autoClassify: true });
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Kunne ikke oprette opgaven.");
      } finally {
        // ALTID nulstil pending – ellers ville en enkelt fejlet oprettelse
        // låse ALLE Hurtige handlinger-knapper (de er disabled mens pending).
        setPending(null);
      }
    })();
  }

  return (
    <SectionCard
      title="Hurtige handlinger"
      icon={Zap}
      headerAction={scratchpad ? <TextScratchpad /> : undefined}
    >
      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        {actions.map((action) => {
          const Icon = action.icon;
          const isPending = pending === action.label;
          return (
            <motion.button
              key={action.label}
              variants={item}
              type="button"
              onClick={() => run(action)}
              disabled={Boolean(pending)}
              className="quick-action-btn group relative flex select-none flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-border/60 bg-secondary/30 p-3 text-center transition-all duration-200 ease-out disabled:opacity-60"
              style={{ "--qa-color": action.color } as React.CSSProperties}
            >
              <span
                className="flex size-9 items-center justify-center rounded-xl transition-transform duration-200 ease-out group-hover:scale-110"
                style={{
                  backgroundColor: `color-mix(in oklab, ${action.color} 16%, transparent)`,
                  color: action.color,
                }}
              >
                <Icon className={isPending ? "size-4 animate-pulse" : "size-4"} />
              </span>
              <span className="text-xs font-medium leading-tight">{action.label}</span>
            </motion.button>
          );
        })}
      </motion.div>
    </SectionCard>
  );
}
