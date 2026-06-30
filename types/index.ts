/**
 * Globale typer for LifeOS.
 * Kode/typer er på engelsk (regel), brugervendt tekst er på dansk.
 */

/** De tre "verdener" i LifeOS – driver farvezone og filtrering senere. */
export type Workspace = "shared" | "private" | "work";

export const WORKSPACE_LABELS: Record<Workspace, string> = {
  shared: "Samlet overblik",
  private: "Privat",
  work: "Storgaard Biler",
};
