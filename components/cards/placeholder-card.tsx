import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * PlaceholderCard – et tomt "kommer snart"-kort til dashboardet.
 * Indeholder ikon, titel og kort beskrivelse, men endnu ingen rigtig funktion.
 * (Funktionalitet bygges i senere faser.)
 */
export function PlaceholderCard({
  title,
  description,
  icon: Icon,
  className,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <Card interactive className={cn("group flex h-full flex-col", className)}>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary transition-all duration-200 ease-out group-hover:scale-105 group-hover:bg-primary/15">
            <Icon className="size-5" />
          </div>
          <CardTitle>{title}</CardTitle>
        </div>
        <Badge variant="secondary">Kommer snart</Badge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <CardDescription className="mb-4">{description}</CardDescription>
        {/* Tom tilstand – pladsholder-linjer der antyder fremtidigt indhold */}
        <div className="mt-auto space-y-2">
          <div className="h-2.5 w-3/4 rounded-full bg-muted" />
          <div className="h-2.5 w-1/2 rounded-full bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}
