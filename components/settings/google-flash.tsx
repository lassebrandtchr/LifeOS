"use client";

import * as React from "react";
import { toast } from "sonner";

/**
 * Viser en kvittering efter Google-forbindelses-flowet (?google=...).
 * Kører én gang, når Indstillinger åbnes efter et redirect fra Google.
 */
const MESSAGES: Record<string, { type: "success" | "error"; text: string }> = {
  forbundet: { type: "success", text: "Google er forbundet 🎉" },
  fejl: { type: "error", text: "Google-forbindelsen fejlede. Prøv igen." },
  afbrudt: { type: "error", text: "Forbindelsen blev afbrudt." },
  "mangler-noegler": {
    type: "error",
    text: "Google-nøglerne mangler i .env.local endnu.",
  },
};

export function GoogleFlash({ status }: { status?: string }) {
  const fired = React.useRef(false);
  React.useEffect(() => {
    if (fired.current || !status) return;
    fired.current = true;
    const msg = MESSAGES[status];
    if (!msg) return;
    if (msg.type === "success") toast.success(msg.text);
    else toast.error(msg.text);
  }, [status]);
  return null;
}

const MS_MESSAGES: Record<string, { type: "success" | "error"; text: string }> = {
  forbundet: { type: "success", text: "Outlook er forbundet 🎉" },
  fejl: { type: "error", text: "Outlook-forbindelsen fejlede. Prøv igen." },
  afbrudt: { type: "error", text: "Forbindelsen blev afbrudt." },
  "mangler-noegler": {
    type: "error",
    text: "Microsoft-nøglerne mangler i .env.local endnu.",
  },
};

/** Viser en kvittering efter Outlook-forbindelses-flowet (?microsoft=...). */
export function MicrosoftFlash({ status }: { status?: string }) {
  const fired = React.useRef(false);
  React.useEffect(() => {
    if (fired.current || !status) return;
    fired.current = true;
    const msg = MS_MESSAGES[status];
    if (!msg) return;
    if (msg.type === "success") toast.success(msg.text);
    else toast.error(msg.text);
  }, [status]);
  return null;
}
