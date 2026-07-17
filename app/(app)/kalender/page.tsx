import { Calendar } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { CalendarSections } from "@/components/calendar/calendar-sections";
import { NewEventDialog } from "@/components/calendar/new-event-dialog";
import { CalendarSyncButton } from "@/components/calendar/calendar-sync-button";
import { getCalendarEvents } from "@/features/integrations/queries";
import { getWorkspaceOrder } from "@/features/tasks/section-order";
import type { Workspace } from "@/features/tasks/constants";

export const metadata = { title: "Kalender" };

/**
 * ?ny=<titel>&verden=work åbner "Ny begivenhed" forudfyldt – bruges af
 * "Hurtige handlinger" (fx "Aflevering af bil" fra Storgaard-siden).
 */
export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<{ ny?: string; verden?: string }>;
}) {
  const { ny, verden } = await searchParams;
  const events = await getCalendarEvents(300);
  const initialOrder = getWorkspaceOrder();
  const autoOpen = ny !== undefined;
  const initialWorkspace: Workspace | undefined =
    verden === "work" || verden === "private" ? verden : undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Kalender"
        description="Aftaler og begivenheder fra privat og Storgaard Biler."
        icon={Calendar}
        action={
          <div className="flex items-center gap-2">
            <CalendarSyncButton variant="outline" />
            <NewEventDialog
              initialTitle={ny || undefined}
              initialWorkspace={initialWorkspace}
              autoOpen={autoOpen}
            />
          </div>
        }
      />
      <CalendarSections events={events} initialOrder={initialOrder} />
    </div>
  );
}
