"use client";

import * as React from "react";
import { Download, FileText, ImageIcon, Loader2, Paperclip, Film } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  getEmailAttachment,
  type EmailAttachment,
  type ThreadMessage,
} from "@/features/mail/actions";

/**
 * MessageBody – viser ÉN besked i en mail-tråd i FULDT format:
 *
 *  - HTML-brødtekst i en sandboxet <iframe> (uden allow-scripts/allow-
 *    same-origin, så mailens kode aldrig kan køre – links åbner i ny fane).
 *    Fjernbilleder og allerede-indlejrede inline-billeder vises direkte.
 *  - Vedhæftninger som klikbare kort: billeder/video/PDF vises inde i appen,
 *    alt kan downloades. Indholdet hentes først VED klik (getEmailAttachment),
 *    for netop den besked vedhæftningen sidder på (messageId).
 */
export function EmailBody({
  emailId,
  message,
  tall = false,
  tone = "default",
}: {
  emailId: string;
  message: ThreadMessage;
  tall?: boolean;
  /** "invert" = teksten står på en farvet chat-boble og arver dens tekstfarve. */
  tone?: "default" | "invert";
}) {
  const invert = tone === "invert";
  return (
    <div className="space-y-3">
      {message.bodyHtml ? (
        <HtmlFrame html={message.bodyHtml} tall={tall} />
      ) : message.body ? (
        <p
          className={cn(
            "whitespace-pre-wrap text-sm leading-relaxed",
            invert ? "text-inherit" : "text-foreground/90",
          )}
        >
          {message.body}
        </p>
      ) : (
        <p
          className={cn(
            "text-sm italic",
            invert ? "text-inherit opacity-80" : "text-muted-foreground",
          )}
        >
          Ingen brødtekst.
        </p>
      )}

      {message.attachments.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Paperclip className="size-3.5" />
            {message.attachments.length}{" "}
            {message.attachments.length === 1 ? "vedhæftning" : "vedhæftninger"}
          </p>
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((att) => (
              <AttachmentCard
                key={att.id}
                emailId={emailId}
                messageId={message.messageId}
                att={att}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Højst så høj må en mail være, før den foldes sammen med "Vis hele mailen". */
const COLLAPSED_MAX_PX = 420;

/**
 * Mail-HTML i en sandboxet <iframe> der TILPASSER SIN EGEN HØJDE til indholdet.
 *
 * Hvorfor selv-tilpassende? I tråd-visningen (chat-bobler) så en to-linjers
 * "Tak for svaret" ellers ud som en kæmpe tom kasse, fordi højden var låst til
 * en fast andel af skærmen. Nu fylder hver besked præcis det, den skal – som i
 * en beskedtråd. Lange nyhedsbreve foldes sammen med en "Vis hele mailen"-knap.
 *
 * Sikkerhed: `allow-scripts` gives ALDRIG, så mailens egen kode kan ikke køre.
 * `allow-same-origin` gives kun, så VI (siden udenom) kan måle indholdets højde
 * – uden allow-scripts kan intet inde i rammen udnytte det.
 */
function HtmlFrame({ html, tall = false }: { html: string; tall?: boolean }) {
  const ref = React.useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = React.useState<number | null>(null);
  const [expanded, setExpanded] = React.useState(false);

  const srcDoc = React.useMemo(
    () =>
      `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
        html,body{margin:0;padding:0}
        body{padding:14px 16px;font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.6;color:#1a1a1a;background:#ffffff;word-break:break-word;overflow-wrap:anywhere}
        img,video{max-width:100%;height:auto}
        table{max-width:100%}
        a{color:#1a56db}
        /* Undgå at et tomt sidste afsnit giver falsk ekstra højde. */
        body>*:last-child{margin-bottom:0}
      </style></head><body>${html}</body></html>`,
    [html],
  );

  // Mål indholdets højde – ved indlæsning, når billeder falder på plads
  // (ResizeObserver + et par forsinkede målinger), og når vinduet ændrer bredde.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let stopped = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let ro: ResizeObserver | null = null;

    const measure = () => {
      if (stopped) return;
      try {
        const doc = el.contentDocument;
        if (!doc?.body) return;
        const h = Math.max(
          doc.body.scrollHeight,
          doc.documentElement?.scrollHeight ?? 0,
        );
        if (h > 0) setHeight(h);
      } catch {
        // Kunne ikke måles (fx blokeret) – fald tilbage til en fast højde.
      }
    };

    const onLoad = () => {
      measure();
      // Billeder/skrifttyper lander typisk lidt efter load.
      for (const ms of [120, 400, 1200, 2500]) timers.push(setTimeout(measure, ms));
      try {
        const body = el.contentDocument?.body;
        if (body && "ResizeObserver" in window) {
          ro = new ResizeObserver(measure);
          ro.observe(body);
        }
      } catch {
        /* uden observer klarer de forsinkede målinger det */
      }
    };

    el.addEventListener("load", onLoad);
    if (el.contentDocument?.readyState === "complete") onLoad();
    window.addEventListener("resize", measure);
    return () => {
      stopped = true;
      el.removeEventListener("load", onLoad);
      window.removeEventListener("resize", measure);
      ro?.disconnect();
      for (const t of timers) clearTimeout(t);
    };
  }, [srcDoc]);

  const maxPx = tall ? Math.round(COLLAPSED_MAX_PX * 1.6) : COLLAPSED_MAX_PX;
  const measured = height ?? null;
  const isLong = measured !== null && measured > maxPx + 40;
  const shown = measured === null ? maxPx : isLong && !expanded ? maxPx : measured;

  return (
    <div className="w-full">
      <div className="relative">
        <iframe
          ref={ref}
          srcDoc={srcDoc}
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
          referrerPolicy="no-referrer"
          title="Mail-indhold"
          // Kunne højden ikke måles, skal rammen kunne rulle indeni – ellers
          // ville en lang mail blive klippet af uden vej videre.
          scrolling={measured === null ? "auto" : "no"}
          style={{ height: shown }}
          className="w-full rounded-xl border border-border/60 bg-white"
        />
        {isLong && !expanded && (
          // Blød udtoning, så det er tydeligt at der er mere at læse.
          <div className="pointer-events-none absolute inset-x-px bottom-px h-16 rounded-b-xl bg-gradient-to-t from-white to-transparent" />
        )}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? "Vis mindre" : "Vis hele mailen"}
        </button>
      )}
    </div>
  );
}

function fmtSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentCard({
  emailId,
  messageId,
  att,
}: {
  emailId: string;
  messageId: string;
  att: EmailAttachment;
}) {
  const [loading, setLoading] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewMime, setPreviewMime] = React.useState<string>("");

  const isImage = att.mime.startsWith("image/");
  const isVideo = att.mime.startsWith("video/");
  const isPdf = att.mime === "application/pdf" || /\.pdf$/i.test(att.name);
  const Icon = isImage ? ImageIcon : isVideo ? Film : FileText;

  React.useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  async function fetchBlob(): Promise<{ url: string; name: string; mime: string } | null> {
    const content = await getEmailAttachment(emailId, att.id, messageId);
    if (!content) {
      toast.error("Kunne ikke hente vedhæftningen.");
      return null;
    }
    const bytes = Uint8Array.from(atob(content.base64), (c) => c.charCodeAt(0));
    const mime = att.mime && att.mime !== "application/octet-stream" ? att.mime : content.mime;
    const blob = new Blob([bytes], { type: mime });
    return { url: URL.createObjectURL(blob), name: att.name || content.name, mime };
  }

  async function handleOpen() {
    if (loading) return;
    setLoading(true);
    const res = await fetchBlob();
    setLoading(false);
    if (!res) return;
    if (isImage || isVideo || isPdf) {
      setPreviewUrl(res.url);
      setPreviewMime(isPdf ? "application/pdf" : res.mime);
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
        className="flex max-w-full items-center gap-2 rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
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
            {isImage || isVideo || isPdf ? " · klik for at se" : " · klik for at hente"}
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
        <video src={previewUrl} controls className="mt-2 max-h-[50vh] w-full rounded-xl border border-border/60" />
      )}
      {previewUrl && previewMime === "application/pdf" && (
        <object
          data={previewUrl}
          type="application/pdf"
          className="mt-2 h-[70vh] w-full rounded-xl border border-border/60"
        >
          <p className="p-3 text-sm text-muted-foreground">
            Kan ikke vise PDF her.{" "}
            <button
              type="button"
              onClick={() => triggerDownload(previewUrl, att.name)}
              className="font-medium text-primary underline"
            >
              Hent den i stedet
            </button>
            .
          </p>
        </object>
      )}
    </div>
  );
}
