import "server-only";

import { getDashboardStats, type DashboardStats } from "@/features/dashboard/stats";

/**
 * Notifikationer til klokken i topbaren. Bygger videre på de samme tal som
 * "Arbejdsoverblik" på forsiden (features/dashboard/stats.ts) – forfaldne
 * opgaver > hasteopgaver > vigtige opgaver denne uge, i den rækkefølge.
 */
export type NotificationItem = {
  id: string;
  text: string;
  tone: "danger" | "warn";
  href: string;
};

export function buildNotifications(stats: DashboardStats): NotificationItem[] {
  const items: NotificationItem[] = [];

  if (stats.overdue > 0) {
    items.push({
      id: "overdue",
      text: `${stats.overdue} forfaldne opgave${stats.overdue !== 1 ? "r" : ""}`,
      tone: "danger",
      href: "/opgaver?filter=overdue",
    });
  }

  if (stats.urgent > 0) {
    items.push({
      id: "urgent",
      text: `Du har ${stats.urgent} hasteopgave${stats.urgent !== 1 ? "r" : ""} i dag`,
      tone: "danger",
      href: "/opgaver?filter=urgent",
    });
  }

  if (stats.importantWeek > 0) {
    items.push({
      id: "important",
      text: `Du har ${stats.importantWeek} vigtige opgave${stats.importantWeek !== 1 ? "r" : ""} denne uge`,
      tone: "warn",
      href: "/opgaver?filter=important",
    });
  }

  return items;
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const stats = await getDashboardStats();
  return buildNotifications(stats);
}
