import { Sparkles } from "lucide-react";

/**
 * BriefCard – Chief of Staff's dags-brief (morgen / arbejdstjek / aften),
 * valgt automatisk ud fra klokkeslættet. Genereret ud fra dine rigtige data.
 */
export function BriefCard({
  brief,
}: {
  brief: { greeting: string; title: string; lines: string[] };
}) {
  return (
    <div
      className="relative overflow-hidden rounded-card border border-white/15 p-6 text-white shadow-greeting sm:p-7"
      style={{ backgroundImage: "var(--greeting-bg)" }}
    >
      {/* glas-skær – samme liquid glass-look som "Goddag, Lasse" på forsiden */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,0.22), transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -right-10 -top-16 size-56 rounded-full bg-white/20 blur-3xl"
      />
      <div className="flex items-center gap-2 text-sm font-medium text-white/85">
        <Sparkles className="size-4" />
        Chief of Staff · {brief.title}
      </div>
      <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{brief.greeting}</h1>
      <ul className="mt-3 space-y-1.5">
        {brief.lines.map((line, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-white/90">
            <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-white/70" />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
