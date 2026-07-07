import { BilinfoNeedsPage } from "@/components/bilinfo/bilinfo-needs-page";
import { getBilinfoSummary } from "@/lib/bilinfo/client";

export const metadata = { title: "Biler der mangler billeder/udstyr" };

/**
 * Fuld oversigt over Bilinfo-biler der mangler udstyr eller billeder.
 * Nås via knappen i bunden af Arbejdsoverblik på forsiden.
 */
export default async function BilerManglerPage() {
  const summary = await getBilinfoSummary();
  return <BilinfoNeedsPage summary={summary} />;
}
