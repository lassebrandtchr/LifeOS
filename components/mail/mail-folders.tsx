"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Inbox, Folder, Send, Trash2, Star, Tag, Loader2, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { GmailFolder } from "@/features/mail/manage-actions";

/** Ikon pr. systemmappe (ellers en generisk mappe). */
function folderIcon(f: GmailFolder) {
  if (f.type === "user") return Tag;
  switch (f.id) {
    case "INBOX": return Inbox;
    case "SENT": return Send;
    case "TRASH": return Trash2;
    case "STARRED": return Star;
    default: return Folder;
  }
}

/** Én mappe i sidebaren – også et drop-mål for træk-og-slip. */
function FolderRow({
  folder,
  active,
  onSelect,
}: {
  folder: GmailFolder;
  active: boolean;
  onSelect: () => void;
}) {
  // Kun brugermapper (og ikke-indbakke) giver mening at flytte TIL.
  const droppable = folder.id !== "INBOX";
  const { setNodeRef, isOver } = useDroppable({
    id: `folder:${folder.id}`,
    disabled: !droppable,
    data: { folderId: folder.id, folderName: folder.name },
  });
  const Icon = folderIcon(folder);

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
        active ? "bg-primary/10 font-medium text-primary" : "hover:bg-secondary/60",
        // Tydelig markering, når en mail trækkes hen over mappen.
        isOver && droppable && "ring-2 ring-primary ring-offset-1 ring-offset-background bg-primary/15",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
      <span className="min-w-0 flex-1 truncate">{folder.name}</span>
      {folder.unread > 0 && (
        <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
          {folder.unread}
        </span>
      )}
    </button>
  );
}

export function MailFolders({
  folders,
  loading,
  health,
  errorReason,
  activeFolderId,
  onSelectInbox,
  onSelectFolder,
}: {
  folders: GmailFolder[];
  loading: boolean;
  /** Google-forbindelsens tilstand – til en præcis fejlbesked. */
  health: "notConfigured" | "notConnected" | "expired" | "ok" | null;
  /** Googles egen fejlbesked, hvis mappe-hentningen fejlede. */
  errorReason?: string;
  /** null = indbakke-visningen (Gmail + Outlook). */
  activeFolderId: string | null;
  onSelectInbox: () => void;
  onSelectFolder: (folder: GmailFolder) => void;
}) {
  const systemFolders = folders.filter((f) => f.type === "system" && f.id !== "INBOX");
  const userFolders = folders.filter((f) => f.type === "user");

  return (
    <aside className="w-full shrink-0 rounded-2xl border border-border/60 bg-card p-3 lg:w-60">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Gmail-mapper
      </p>

      {/* Indbakke = standardvisningen (Gmail + Outlook samlet). */}
      <button
        type="button"
        onClick={onSelectInbox}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
          activeFolderId === null ? "bg-primary/10 font-medium text-primary" : "hover:bg-secondary/60",
        )}
      >
        <Inbox className={cn("size-4 shrink-0", activeFolderId === null ? "text-primary" : "text-muted-foreground")} />
        <span className="flex-1">Indbakke</span>
      </button>

      {loading ? (
        <p className="flex items-center gap-2 px-2.5 py-3 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Henter mapper …
        </p>
      ) : folders.length === 0 ? (
        <div className="space-y-2 px-2.5 py-3">
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
            {health === "expired"
              ? "Din Google-forbindelse er udløbet. Forbind igen for at hente dine mapper og mails."
              : health === "notConnected"
                ? "Google er ikke forbundet. Forbind for at hente dine Gmail-mapper."
                : /scope|insufficient|permission/i.test(errorReason ?? "")
                  ? "LifeOS fik ikke adgang til Gmail (kun kalender blev givet). Forbind igen, og sæt flueben ved Gmail."
                  : "Kunne ikke hente Gmail-mapper. Prøv at forbinde Google igen."}
          </p>
          {errorReason && (
            <p className="text-[10px] text-muted-foreground/70">Gmail: {errorReason}</p>
          )}
          <a
            href="/indstillinger"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-secondary"
          >
            Forbind Google igen
          </a>
        </div>
      ) : (
        <>
          {systemFolders.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {systemFolders.map((f) => (
                <FolderRow
                  key={f.id}
                  folder={f}
                  active={activeFolderId === f.id}
                  onSelect={() => onSelectFolder(f)}
                />
              ))}
            </div>
          )}
          {userFolders.length > 0 && (
            <>
              <p className="px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Dine mapper
              </p>
              <div className="space-y-0.5">
                {userFolders.map((f) => (
                  <FolderRow
                    key={f.id}
                    folder={f}
                    active={activeFolderId === f.id}
                    onSelect={() => onSelectFolder(f)}
                  />
                ))}
              </div>
            </>
          )}
          <p className="px-2 pt-3 text-[11px] leading-relaxed text-muted-foreground/80">
            Træk en mail fra indbakken hen på en mappe for at flytte den.
          </p>
        </>
      )}
    </aside>
  );
}
