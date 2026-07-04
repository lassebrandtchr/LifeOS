"use client";

import dynamic from "next/dynamic";

/**
 * Lazy-indlæst udgave af RichTextEditor.
 *
 * Tiptap + ProseMirror fylder ~730 KB ukomprimeret JS – langt den største
 * chunk i appen. Editoren bruges kun NÅR man redigerer (opgave-modalen og
 * note-kortene), men den globale opgave-modal er monteret i layoutet på
 * ALLE sider, så en statisk import trak hele editoren med i første
 * sideindlæsning overalt. Denne dynamic()-wrapper splitter den ud i sin
 * egen chunk, der først hentes når editoren faktisk skal vises.
 *
 * ssr: false er sikkert (og korrekt): Tiptap er rent klient-side
 * (immediatelyRender: false i forvejen), og editoren står altid i
 * klient-interaktive flows.
 *
 * Brug ALTID denne i stedet for en direkte import af
 * "@/components/ui/rich-text-editor" – ellers ryger chunken tilbage i
 * fælles-bundlen, og gevinsten forsvinder.
 */
export const RichTextEditor = dynamic(
  () => import("@/components/ui/rich-text-editor").then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      // Skelet med samme ydre form som editoren, så intet hopper de
      // få hundrede ms det tager at hente chunken første gang.
      <div className="min-h-32 w-full animate-pulse rounded-xl border border-border/60 bg-secondary/30" />
    ),
  },
);
