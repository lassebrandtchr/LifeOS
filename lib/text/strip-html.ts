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
