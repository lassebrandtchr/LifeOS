import { type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * PagePlaceholder – genbrugelig "kommer snart"-side til de moduler,
 * der endnu ikke er bygget (Privat, Mail, Kalender osv.).
 */
export function PagePlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Badge variant="secondary">Kommer snart</Badge>
          <p className="max-w-md text-sm text-muted-foreground">
            Dette modul er en del af LifeOS, men er endnu ikke bygget. Vi
            tilføjer indhold og funktioner i de kommende faser.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
