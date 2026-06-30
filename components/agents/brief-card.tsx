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
    <div className="relative overflow-hidden rounded-card border border-white/10 p-6 text-white shadow-soft-lg sm:p-7">
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #4f8dff 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -right-10 -top-16 -z-10 size-56 rounded-full bg-white/15 blur-3xl"
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
