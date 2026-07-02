import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * Tekststørrelse-mark – findes IKKE som officiel Tiptap-pakke (et tidligere
 * forsøg på "@tiptap/extension-font-size" fejlede: pakken eksisterer ikke).
 * Selvstændig, lille mark i stedet: sætter inline "font-size" på markeret
 * tekst, uafhængig af Bold/Heading, så man kan ændre størrelse på et
 * vilkårligt tekst-udpluk uden at gøre det til en overskrift.
 */
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

export const FontSize = Mark.create({
  name: "fontSize",

  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize || null,
        renderHTML: (attributes: { size?: string | null }) => {
          if (!attributes.size) return {};
          return { style: `font-size: ${attributes.size}` };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span", style: "font-size" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) =>
          chain().setMark(this.name, { size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().unsetMark(this.name).run(),
    };
  },
});
