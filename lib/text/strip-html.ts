/**
 * Ren tekst-udtræk fra rig-tekst-HTML (fra RichTextEditor) – bruges alle
 * steder noter vises som ÉN linje (kort-forhåndsvisning, søgeresultater,
 * nøgleord-matching i Action-listen), så man aldrig ser rå "<p><strong>"-tags.
 * Blok-elementer (p/div/li/br/h1-6) bliver til linjeskift, så afsnit ikke
 * klistrer sammen ("Punkt 1Punkt 2" i stedet for "Punkt 1 Punkt 2").
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<(p|div|li|h[1-6]|br)[^>]*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** Er indholdet reelt tomt? ("<p></p>" fra en tom Tiptap-editor tæller som tomt). */
export function isHtmlEmpty(html: string | null | undefined): boolean {
  return stripHtml(html).length === 0;
}

/** Samme som stripHtml, men på ÉN linje – til kort-forhåndsvisninger/søgning. */
export function stripHtmlInline(html: string | null | undefined): string {
  return stripHtml(html).replace(/\s+/g, " ").trim();
}

/** Inline-formaterings-tags vi tillader vist (fed/kursiv/understreg osv.). */
const INLINE_ALLOWED = new Set([
  "b", "strong", "i", "em", "u", "s", "strike", "del", "span", "mark", "sub", "sup",
]);
/** CSS-egenskaber vi tillader på <span style="…"> (fra rig-tekst-editoren). */
const SAFE_STYLE = /^(color|background-color|font-weight|font-style|text-decoration|font-size)\s*:/i;

/**
 * Gør rig-tekst-HTML (fra RichTextEditor) sikker at VISE på ÉN linje, med
 * INLINE-formatering bevaret (fed, kursiv, understreg, farve, skriftstørrelse).
 *
 * Bruges hvor vi vil se opgavens emne-formatering (fx Action-listen), i stedet
 * for stripHtml der fjerner ALT. Bælte & seler: farlige blokke fjernes helt,
 * blok-elementer + linjeskift bliver til mellemrum (holder det på én linje), og
 * KUN whitelisted inline-tags beholdes – alle andre tags fjernes (men deres
 * tekst bevares). På <span> beholdes kun en sikker delmængde af `style`.
 * Al øvrig markup (scripts, links, on*-handlers, billeder …) forsvinder.
 */
export function formatInlineHtml(html: string | null | undefined): string {
  if (!html) return "";
  let s = html
    // Farlige blokke: fjern indhold + tags.
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, "")
    // Blok-elementer + linjeskift → mellemrum (én-linjes visning).
    .replace(/<\/?(p|div|h[1-6]|ul|ol|li|blockquote|pre|table|thead|tbody|tr|td|th)\b[^>]*>/gi, " ")
    .replace(/<br\s*\/?>(?=)/gi, " ");

  // Gennemgå hver tag: behold kun tilladte inline-tags (uden attributter,
  // undtagen en saniteret style på <span>). Ikke-tilladte tags fjernes helt.
  s = s.replace(/<(\/?)([a-zA-Z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/g, (_m, close, tag, attrs) => {
    const t = String(tag).toLowerCase();
    if (!INLINE_ALLOWED.has(t)) return "";
    if (close) return `</${t}>`;
    if (t === "span") {
      const m = String(attrs).match(/style\s*=\s*("([^"]*)"|'([^']*)')/i);
      const raw = m ? (m[2] ?? m[3] ?? "") : "";
      const safe = raw
        .split(";")
        .map((d) => d.trim())
        .filter((d) => SAFE_STYLE.test(d))
        .join("; ");
      return safe ? `<span style="${safe}">` : "<span>";
    }
    return `<${t}>`;
  });

  return s.replace(/\s+/g, " ").trim();
}
