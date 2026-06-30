import { type LucideIcon } from "lucide-react";

/**
 * PageHeader – fælles side-overskrift (ikon + titel + beskrivelse).
 * Samme udtryk som PagePlaceholder, så bygget og ubygget side ser ens ud.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
