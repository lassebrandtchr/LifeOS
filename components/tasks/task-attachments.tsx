"use client";

import * as React from "react";
import { Paperclip, Upload, File as FileIcon, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

/**
 * TaskAttachments – upload og vis filer på en opgave (Supabase Storage).
 *
 * Filer ligger i bucket "task-attachments" under <user_id>/<task_id>/<filnavn>.
 * RLS på storage sikrer, at man kun rører sine egne filer. Robust: hvis bucket
 * ikke findes endnu (migration 0008 ikke kørt), vises en venlig besked.
 */

const BUCKET = "task-attachments";

type StoredFile = { name: string; path: string };

export function TaskAttachments({ taskId }: { taskId: string }) {
  const supabase = React.useMemo(() => createClient(), []);
  const [files, setFiles] = React.useState<StoredFile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [unavailable, setUnavailable] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const prefix = `${user.id}/${taskId}`;
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) {
      setUnavailable(true);
      setLoading(false);
      return;
    }
    setFiles(
      (data ?? [])
        .filter((f) => f.name !== ".emptyFolderPlaceholder")
        .map((f) => ({ name: f.name, path: `${prefix}/${f.name}` })),
    );
    setLoading(false);
  }, [supabase, taskId]);

  React.useEffect(() => {
    // Henter filer ved åbning – ægte ekstern datakilde (Supabase Storage).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // tillad upload af samme fil igen
    if (!file) return;
    setUploading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return;
    }
    const safeName = file.name.replace(/[^\w.\-() æøåÆØÅ]/g, "_");
    const path = `${user.id}/${taskId}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: false,
    });
    setUploading(false);
    if (error) {
      const missingBucket = unavailable || /bucket/i.test(error.message);
      toast.error(
        missingBucket
          ? "Filupload er ikke slået til endnu (kør migration 0008 i Supabase)."
          : `Kunne ikke uploade filen: ${error.message}`,
      );
      return;
    }
    toast.success("Fil vedhæftet ✓");
    load();
  }

  async function openFile(path: string) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 10);
    if (error || !data?.signedUrl) {
      toast.error("Kunne ikke åbne filen.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function remove(path: string) {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      toast.error("Kunne ikke slette filen.");
      return;
    }
    setFiles((prev) => prev.filter((f) => f.path !== path));
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Paperclip className="size-4 text-primary" />
          Vedhæftninger
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Upload className="size-3.5" />
          )}
          {uploading ? "Uploader …" : "Vedhæft fil"}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={onPick}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
        />
      </div>

      {loading ? (
        <p className="rounded-xl border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
          Henter filer …
        </p>
      ) : files.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
          Ingen filer endnu. Vedhæft JPG, PNG, PDF, Word eller Excel.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li
              key={f.path}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2"
            >
              <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              <button
                type="button"
                onClick={() => openFile(f.path)}
                className="min-w-0 flex-1 truncate text-left text-sm hover:underline"
                title={f.name}
              >
                {f.name.replace(/^\d+-/, "")}
              </button>
              <button
                type="button"
                onClick={() => remove(f.path)}
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label="Fjern fil"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
