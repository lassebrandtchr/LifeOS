"use client";

import * as React from "react";
import { Stethoscope, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { testGoogleAccess, type GoogleTest } from "@/features/integrations/diagnostics";

/**
 * GoogleDiagnostics – "Test Google-forbindelse"-kort under Indstillinger.
 * Laver rigtige kald til Gmail og Kalender og viser præcis, hvad der virker,
 * og hvad Google klager over – så et forbindelsesproblem kan findes med det
 * samme i stedet for at gætte.
 */
export function GoogleDiagnostics() {
  const [result, setResult] = React.useState<GoogleTest | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function run() {
    setLoading(true);
    try {
      setResult(await testGoogleAccess());
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const hasGmailScope = result?.scopes ? /gmail/i.test(result.scopes) : false;
  const hasCalScope = result?.scopes ? /calendar/i.test(result.scopes) : false;

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
      <div className="mb-1 flex items-center gap-2">
        <Stethoscope className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">Test Google-forbindelse</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Tjekker om LifeOS kan læse din Gmail og Google Kalender lige nu – og viser
        præcis, hvad der evt. er galt.
      </p>

      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        {loading ? "Tester …" : "Test forbindelse"}
      </button>

      {result && (
        <div className="mt-5 space-y-3">
          <Row
            label="Forbindelse"
            ok={result.health === "ok"}
            detail={
              result.health === "ok"
                ? "Forbundet og token virker"
                : result.health === "expired"
                  ? "Udløbet – forbind Google igen"
                  : result.health === "notConnected"
                    ? "Ikke forbundet endnu"
                    : "Google er ikke sat op i appen"
            }
          />
          <Row
            label="Gmail-adgang"
            ok={result.gmail.ok}
            detail={
              result.gmail.ok
                ? "Kan læse mails og mapper ✓"
                : `${result.gmail.reason ?? "fejl"}${!hasGmailScope && result.health === "ok" ? " (Gmail-tilladelse mangler – forbind igen med flueben ved Gmail)" : ""}`
            }
          />
          <Row
            label="Kalender-adgang"
            ok={result.calendar.ok}
            detail={
              result.calendar.ok
                ? "Kan læse dine kalendere ✓"
                : `${result.calendar.reason ?? "fejl"}${!hasCalScope && result.health === "ok" ? " (Kalender-tilladelse mangler – forbind igen med flueben ved Kalender)" : ""}`
            }
          />

          {(!result.gmail.ok || !result.calendar.ok) && result.health === "ok" && (
            <p className="rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-sm text-foreground">
              Forbindelsen virker, men en tilladelse mangler. Gå til Google-connectoren
              ovenfor → <strong>Afbryd</strong> → <strong>Forbind</strong> igen, og sæt
              flueben ved <strong>både Gmail og Kalender</strong> på Googles skærm.
            </p>
          )}
          {result.scopes && (
            <p className="text-[11px] text-muted-foreground/70">
              Givne tilladelser: {result.scopes}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function Row({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-2.5">
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
      ) : (
        <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className={cn("text-xs [overflow-wrap:anywhere]", ok ? "text-muted-foreground" : "text-destructive")}>
          {detail}
        </p>
      </div>
    </div>
  );
}
