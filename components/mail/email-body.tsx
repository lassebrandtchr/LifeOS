"use client";

import * as React from "react";
import { Download, FileText, ImageIcon, Loader2, Paperclip, Film } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  getEmailAttachment,
  type EmailAttachment,
  type EmailDetail,
} from "@/features/mail/actions";

/**
 * EmailBody – viser en mail i FULDT format inde i appen:
 *
 *  - HTML-brødtekst i en sandboxet <iframe> (uden allow-scripts/allow-
 *    same-origin, så mailens kode aldrig kan køre – links åbner i ny fane
 *    via <base target="_blank"> + allow-popups). Fjernbilleder og de
 *    allerede-indlejrede inline-billeder (data-URI'er) vises direkte.
 *  - Vedhæftninger som klikbare kort: billeder/video previews inde i appen,
 *    alt kan downloades. Indholdet hentes først VED klik (getEmailAttachment).
 *
 * Mail-HTML er designet til hvid baggrund, så iframen er altid hvid – præcis
 * som Gmail/Outlook selv gør i dark mode.
 */
export function EmailBody({ detail }: { detail: EmailDetail }) {
  return (
    <div className="space-y-4">
      {detail.bodyHtml ? (
        <HtmlFrame html={detail.bodyHtml} />
      ) : detail.body ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {detail.body}
        </p>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          Ingen brødtekst tilgængelig.
        </p>
      )}

      {detail.attachments.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Paperclip className="size-3.5" />
            {detail.attachments.length}{" "}
            {detail.attachments.length === 1 ? "vedhæftning" : "vedhæftninger"}
          </p>
          <div className="flex flex-wrap gap-2">
            {detail.attachments.map((att) => (
              <AttachmentCard key={att.id} emailId={detail.id} att={att} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HtmlFrame({ html }: { html: string }) {
  const srcDoc = React.useMemo(
    () =>
      `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
        body{margin:0;padding:16px;font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.6;color:#1a1a1a;background:#ffffff;word-break:break-word;overflow-wrap:anywhere}
        img,video{max-width:100%;height:auto}
        table{max-width:100%}
        a{color:#1a56db}
      </style></head><body>${html}</body></html>`,
    [html],
  );
  return (
    <iframe
      srcDoc={srcDoc}
      // Ingen allow-scripts/allow-same-origin: mail-kode kan ALDRIG køre.
      // allow-popups(+escape) gør at links kan åbne i en ny, usandboxet fane.
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      title="Mail-indhold"
      className="h-[55vh] min-h-72 w-full rounded-xl border border-border/60 bg-white"
    />
  );
}

function fmtSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentCard({ emailId, att }: { emailId: string; att: EmailAttachment }) {
  const [loading, setLoading] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewMime, setPreviewMime] = React.useState<string>("");

  const isImage = att.mime.startsWith("image/");
  const isVideo = att.mime.startsWith("video/");
  const Icon = isImage ? ImageIcon : isVideo ? Film : FileText;

  // Objekt-URL'er ryddes op når kortet forsvinder.
  React.useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  async function fetchBlob(): Promise<{ url: string; name: string; mime: string } | null> {
    const content = await getEmailAttachment(emailId, att.id);
    if (!content) {
      toast.error("Kunne ikke hente vedhæftningen.");
      return null;
    }
    const bytes = Uint8Array.from(atob(content.base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: content.mime });
    return {
      url: URL.createObjectURL(blob),
      name: att.name || content.name,
      mime: content.mime,
    };
  }

  async function handleOpen() {
    if (loading) return;
    // Billeder/video: vis preview inde i appen. Andet: download direkte.
    setLoading(true);
    const res = await fetchBlob();
    setLoading(false);
    if (!res) return;
    if (isImage || isVideo) {
      setPreviewUrl(res.url);
      setPreviewMime(res.mime);
    } else {
      triggerDownload(res.url, res.name);
    }
  }

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    const res = await fetchBlob();
    setLoading(false);
    if (res) triggerDownload(res.url, res.name);
  }

  function triggerDownload(url: string, name: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "flex max-w-full items-center gap-2 rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary",
        )}
      >
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Icon className="size-4 shrink-0 text-primary" />
        )}
        <span className="min-w-0">
          <span className="block truncate font-medium">{att.name}</span>
          <span className="block text-xs text-muted-foreground">
            {fmtSize(att.size)}
            {isImage || isVideo ? " · klik for at se" : " · klik for at hente"}
          </span>
        </span>
        <span
          role="button"
          aria-label={`Hent ${att.name}`}
          onClick={handleDownload}
          className="ml-1 flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          <Download className="size-3.5" />
        </span>
      </button>

      {previewUrl && previewMime.startsWith("image/") && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={att.name}
          className="mt-2 max-h-[50vh] w-auto max-w-full rounded-xl border border-border/60"
        />
      )}
      {previewUrl && previewMime.startsWith("video/") && (
        <video
          src={previewUrl}
          controls
          className="mt-2 max-h-[50vh] w-full rounded-xl border border-border/60"
        />
      )}
    </div>
  );
}
