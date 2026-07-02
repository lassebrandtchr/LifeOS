"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold as BoldIcon, Heading2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { FontSize } from "@/components/ui/rich-text-editor/font-size-mark";
import { isHtmlEmpty } from "@/lib/text/strip-html";

const SIZES: { label: string; value: string | null }[] = [
  { label: "Normal", value: null },
  { label: "Stor", value: "1.125em" },
  { label: "Ekstra stor", value: "1.375em" },
];

/**
 * RichTextEditor – genbrugelig rig-tekst-editor (Tiptap) til alle "note"-
 * felter i appen (opgaver, projekter, note-kasser). Gemmer indhold som HTML
 * i den samme text-kolonne, der tidligere holdt ren tekst – ældre ren-tekst
 * indhold vises stadig korrekt (Tiptap fortolker det bare som ét afsnit).
 *
 * Værktøjslinje: "Overskrift" (større + fed, hele linjen) og "Fed" (kun det
 * markerede) er to uafhængige knapper, plus en størrelse-vælger til at
 * ændre skriftstørrelsen på et vilkårligt markeret tekst-udpluk – præcis de
 * tre ting Lasse har bedt om.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeightClassName = "min-h-32",
  compact = false,
  autoFocus = false,
  bare = false,
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
  compact?: boolean;
  autoFocus?: boolean;
  /** Uden egen kant/baggrund – til brug INDE i en boks der allerede har det (fx et enkelt stack-punkt). */
  bare?: boolean;
  className?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
      }),
      FontSize,
      Placeholder.configure({ placeholder: placeholder ?? "Skriv her …" }),
    ],
    content: value,
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        class: cn(
          "rte-content w-full resize-none bg-transparent text-sm leading-relaxed outline-none",
          minHeightClassName,
        ),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Ekstern værdi (fx skift af redigeret opgave/note) skal afspejles i
  // editoren – Tiptap er en imperativ editor-instans, ikke React-state, så
  // synkroniseringen SKAL ske via setContent (ikke almindelig setState),
  // og kun når værdien reelt afviger for ikke at nulstille markøren mens
  // man skriver (onUpdate ovenfor sender jo selv "value" tilbage igen).
  // "" og Tiptaps egen tomme-doc-HTML ("<p></p>") tæller som ens, ellers
  // ville en frisk, tom editor (fx et nyt stack-punkt) blive nulstillet
  // lige efter mount og ødelægge autoFocus.
  React.useEffect(() => {
    if (!editor) return;
    if (isHtmlEmpty(value) && editor.isEmpty) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  const currentSize =
    (editor.getAttributes("fontSize").size as string | undefined) ?? null;

  return (
    <div
      className={cn(
        "w-full",
        bare
          ? "focus-within:outline-none"
          : "rounded-xl border border-border/60 bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1 px-2",
          bare ? "mb-1 border-b border-border/40 pb-1" : cn("border-b border-border/50", compact ? "py-1" : "py-1.5"),
        )}
      >
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="Overskrift"
        >
          <Heading2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="Fed"
        >
          <BoldIcon className="size-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border/60" />
        <select
          value={currentSize ?? ""}
          onChange={(e) => {
            const v = e.target.value || null;
            if (v) editor.chain().focus().setFontSize(v).run();
            else editor.chain().focus().unsetFontSize().run();
          }}
          className="h-6 rounded-md border border-border/50 bg-secondary/40 px-1.5 text-[11px] text-foreground outline-none"
          aria-label="Tekststørrelse"
        >
          {SIZES.map((s) => (
            <option key={s.label} value={s.value ?? ""}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <EditorContent editor={editor} className={bare ? "" : cn("px-3.5", compact ? "py-2" : "py-2.5")} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex size-6 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
