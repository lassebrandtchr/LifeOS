import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * Tekstfarve-mark – samme selvstændige mønster som FontSize (den officielle
 * "@tiptap/extension-color" kræver en ekstra text-style-pakke; denne lille
 * mark gør præcis det vi skal bruge uden afhængigheder): sætter inline
 * "color" på markeret tekst.
 */
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textColor: {
      setTextColor: (color: string) => ReturnType;
      unsetTextColor: () => ReturnType;
    };
  }
}

export const TextColor = Mark.create({
  name: "textColor",

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.color || null,
        renderHTML: (attributes: { color?: string | null }) => {
          if (!attributes.color) return {};
          return { style: `color: ${attributes.color}` };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span", style: "color" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setTextColor:
        (color: string) =>
        ({ chain }) =>
          chain().setMark(this.name, { color }).run(),
      unsetTextColor:
        () =>
        ({ chain }) =>
          chain().unsetMark(this.name).run(),
    };
  },
});
