"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, ArrowUp, Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { chatScopes } from "@/features/agents/registry";
import { askAssistant } from "@/features/agents/actions";

type Message = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "Hvad er vigtigst i dag?",
  "Hvad mangler jeg?",
  "Hvad skal jeg fokusere på?",
];

/**
 * AssistantChat – LifeOS' centrale chat. Spørger Chief of Staff (regelbaseret),
 * som svarer ud fra dine rigtige opgaver/noter. FASE 8: foreslår kun.
 */
export function AssistantChat() {
  const [scopeId, setScopeId] = React.useState("auto");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [engine, setEngine] = React.useState<"claude" | "regler" | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scope = chatScopes.find((s) => s.id === scopeId) ?? chatScopes[0];

  async function send(text: string) {
    const q = text.trim();
    if (!q || pending) return;
    setInput("");
    // Samtalehistorik sendes med, så Claude kan følge tråden i samtalen.
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { role: "user", text: q }]);
    setPending(true);
    try {
      const reply = await askAssistant(scopeId, q, history);
      setEngine(reply.engine);
      setMessages((m) => [...m, { role: "assistant", text: reply.answer }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Beklager – noget gik galt. Prøv igen." },
      ]);
    } finally {
      setPending(false);
    }
  }

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Chat med LifeOS</h2>
            <p className="text-sm text-muted-foreground">
              Din assistent på tværs af hele dit liv
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/50 px-3 py-1.5 text-sm font-medium outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring">
            {scope.label}
            <ChevronDown className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Fokus</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {chatScopes.map((s) => (
              <DropdownMenuItem key={s.id} onSelect={() => setScopeId(s.id)}>
                <Check className={cn("size-4", s.id === scopeId ? "text-primary opacity-100" : "opacity-0")} />
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Beskeder */}
      {messages.length > 0 && (
        <div
          ref={scrollRef}
          className="max-h-80 space-y-3 overflow-y-auto rounded-xl border border-border/50 bg-background/40 p-3"
        >
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground",
                  )}
                >
                  {m.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {pending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Tænker …
            </div>
          )}
        </div>
      )}

      {/* Forslag (kun før første besked) */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Inputfelt */}
      <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-background/60 p-2.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40">
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Spørg LifeOS om hvad som helst …"
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          aria-label="Send"
          onClick={() => send(input)}
          disabled={pending}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow transition-transform duration-200 ease-out hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {engine === "claude" ? (
          <>Drevet af Claude AI · svarer ud fra dine rigtige opgaver, mails og kalender.</>
        ) : engine === "regler" ? (
          <>
            Regelbaseret svar. Tilføj <code className="rounded bg-secondary px-1">ANTHROPIC_API_KEY</code> i
            Vercel for rigtige AI-svar med Claude.
          </>
        ) : (
          <>LifeOS foreslår – den udfører ingen handlinger uden din godkendelse.</>
        )}
      </p>
    </div>
  );
}
