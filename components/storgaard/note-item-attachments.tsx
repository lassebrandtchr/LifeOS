"use client";

import * as React from "react";
import { Paperclip, File as FileIcon, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

/**
 * NoteItemAttachments – kompakt fil-/billed-/PDF-vedhæftning til ét enkelt
 * punkt i en note-stak (fx "Ting til morgenmødet"). Genbruger PRÆCIS den
 * samme Storage-bucket + RLS som opgavernes vedhæftninger (migration 0008
 * – "task-attachments"), bare med et andet sti-præfiks
 * (<user_id>/note-item-<itemId>/…), så der ikke skal en ny migration til.
 * Billeder vises som små thumbnails; andre filtyper som en navngivet chip.
 */

const BUCKET = "task-attachments";

type StoredFile = { name: string; path: string; isImage: boolean; url?: string };

function isImageName(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|heic|heif)$/i.test(name);
}

export function NoteItemAttachments({ itemId }: { itemId: string }) {
  const supabase = React.useMemo(() => createClient(), []);
  const [files, setFiles] = React.useState<StoredFile[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const prefixRef = React.useRef<string | null>(null);

  const load = React.useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const prefix = `${user.id}/note-item-${itemId}`;
    prefixRef.current = prefix;
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) return;
    const found = (data ?? []).filter((f) => f.name !== ".emptyFolderPlaceholder");
    const withUrls = await Promise.all(
      found.map(async (f) => {
        const path = `${prefix}/${f.name}`;
        const image = isImageName(f.name);
        let url: string | undefined;
        if (image) {
          const { data: signed } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(path, 60 * 30);
          url = signed?.signedUrl;
        }
        return { name: f.name, path, isImage: image, url };
      }),
    );
    setFiles(withUrls);
  }, [supabase, itemId]);

  React.useEffect(() => {
    // Henter eksisterende vedhæftninger ved mount – ægte ekstern datakilde.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
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
    const path = `${user.id}/note-item-${itemId}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
    setUploading(false);
    if (error) {
      toast.error("Kunne ikke vedhæfte filen. Prøv igen.");
      return;
    }
    toast.success("Vedhæftet ✓");
    load();
  }

  async function openFile(f: StoredFile) {
    if (f.url) {
      window.open(f.url, "_blank", "noopener");
      return;
    }
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(f.path, 60 * 10);
    if (error || !data?.signedUrl) {
      toast.error("Kunne ikke åbne filen.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function remove(path: string, e: React.MouseEvent) {
    e.stopPropagation();
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      toast.error("Kunne ikke slette filen.");
      return;
    }
    setFiles((prev) => prev.filter((f) => f.path !== path));
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {files.map((f) =>
        f.isImage && f.url ? (
          <button
            key={f.path}
            type="button"
            onClick={() => openFile(f)}
            className="group relative size-10 shrink-0 overflow-hidden rounded-lg border border-border/60"
            title={f.name.replace(/^\d+-/, "")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt="" className="size-full object-cover" />
            <span
              onClick={(e) => remove(f.path, e)}
              className="absolute right-0 top-0 flex size-4 items-center justify-center rounded-bl bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="size-2.5" />
            </span>
          </button>
        ) : (
          <button
            key={f.path}
            type="button"
            onClick={() => openFile(f)}
            className="group flex shrink-0 items-center gap-1 rounded-lg border border-border/60 bg-secondary/40 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary"
            title={f.name.replace(/^\d+-/, "")}
          >
            <FileIcon className="size-3" />
            <span className="max-w-24 truncate">{f.name.replace(/^\d+-/, "")}</span>
            <span
              onClick={(e) => remove(f.path, e)}
              className="ml-0.5 flex size-3.5 items-center justify-center rounded-full text-muted-foreground hover:text-destructive"
            >
              <X className="size-2.5" />
            </span>
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-border/60 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-60"
      >
        {uploading ? <Loader2 className="size-3 animate-spin" /> : <Paperclip className="size-3" />}
        {uploading ? "Uploader …" : "Vedhæft"}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={onPick}
        accept="image/*,.pdf"
      />
    </div>
  );
}
