import { MarketingWorkspace } from "@/components/markedsfoering/marketing-workspace";
import { getMarketingWorkspaceData } from "@/features/marketing/queries";

export const metadata = { title: "Marketing" };

/**
 * Marketing Workspace (Fase 10) – marketingafdelingens daglige arbejdsplads.
 * Henter hele datagrundlaget på serveren (parallelt) og sender det til den
 * faneblads-baserede klient-arbejdsflade. 100% regelbaseret – ingen AI.
 */
export default async function MarkedsfoeringPage() {
  const data = await getMarketingWorkspaceData();
  return <MarketingWorkspace data={data} />;
}
