import "server-only";

import { unstable_cache } from "next/cache";
import type {
  BilinfoExport,
  BilinfoVehicle,
  CarNeedingWork,
  BilinfoSummary,
} from "@/lib/bilinfo/types";

/**
 * Bilinfo Listing API V.3 – henter Storgaard Bilers egne annoncer og
 * udleder hvilke biler der stadig mangler udstyr eller billeder.
 *
 * Bruges til forsidens Arbejdsoverblik + /biler-mangler. Credentials
 * sættes via env (BILINFO_USERNAME / BILINFO_PASSWORD) og sendes som
 * Basic auth.
 *
 * Feedet er ~2 MB (over Next's 2 MB fetch-cache-grænse), så selve svaret
 * hentes uden cache ("no-store"). I stedet caches det LILLE, udledte
 * resultat via unstable_cache i 1 time – så vi højst henter og gennemgår
 * de 2 MB én gang i timen, delt mellem forside og underside, uden noget
 * separat cron-job.
 */

const BILINFO_EXPORT_URL = "https://gw.bilinfo.net/listingapi/api/export";
const REVALIDATE_SECONDS = 60 * 60;
/** Biler med op til dette antal billeder mangler professionelle billeder. */
const FEW_PICTURES_MAX = 14;

/** Tom, "ikke tilgængelig"-sammenfatning – bruges ved manglende opsætning/fejl. */
const EMPTY_SUMMARY: BilinfoSummary = {
  ok: false,
  totalCars: 0,
  missingEquipment: [],
  noPictures: [],
  fewPictures: [],
};

function authHeader(): string | null {
  const user = process.env.BILINFO_USERNAME;
  const pass = process.env.BILINFO_PASSWORD;
  if (!user || !pass || user.startsWith("din-")) return null;
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

function pictureCount(v: BilinfoVehicle): number {
  if (Array.isArray(v.Pictures)) return v.Pictures.length;
  const n = Number.parseInt(v.PictureCount ?? "", 10);
  return Number.isFinite(n) ? n : 0;
}

function hasEquipment(v: BilinfoVehicle): boolean {
  const std = v.EquipmentList?.length ?? 0;
  const extra = v.ExtraEquipmentList?.length ?? 0;
  return std + extra > 0;
}

/** Dansk tusindtalsformat, fx 448480 → "448.480". Tom streng ved ugyldigt tal. */
function formatInt(raw?: string): string {
  const n = Number.parseInt((raw ?? "").replace(/\D/g, ""), 10);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toLocaleString("da-DK");
}

/** Læselig pris ud fra Bilinfos pristype (kontant, leasing eller "ring"). */
function formatPrice(v: BilinfoVehicle): string {
  const kontant = formatInt(v.Price ?? v.CashPrice);
  if (kontant) return `${kontant} kr.`;
  const leasing = formatInt(v.LeasingPrice);
  if (leasing) return `${leasing} kr./md.`;
  return "Ring for pris";
}

function fullName(v: BilinfoVehicle): string {
  return [v.Make, v.Model, v.Variant].filter(Boolean).join(" ").trim() || "Ukendt bil";
}

function toCar(v: BilinfoVehicle): CarNeedingWork {
  const km = formatInt(v.Mileage);
  return {
    key: v.VehicleSourceId ?? v.VehicleId ?? v.Id ?? Math.random().toString(36),
    name: fullName(v),
    year: v.Year ?? "",
    color: v.Color ?? "",
    price: formatPrice(v),
    mileage: km ? `${km} km` : "",
    pictureCount: pictureCount(v),
  };
}

/**
 * Samme bil kan optræde som flere annoncer (fx kontant + leasing). Vi
 * tæller/viser hver bil én gang ved at gruppere på VehicleSourceId og
 * beholde den første annonce.
 */
function dedupeBySource(vehicles: BilinfoVehicle[]): BilinfoVehicle[] {
  const seen = new Set<string>();
  const out: BilinfoVehicle[] = [];
  for (const v of vehicles) {
    const id = v.VehicleSourceId ?? v.VehicleId ?? v.Id ?? "";
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    out.push(v);
  }
  return out;
}

/** Alfabetisk pæn label-sortering, så listen står roligt fra gang til gang. */
function byLabel(a: CarNeedingWork, b: CarNeedingWork): number {
  return a.name.localeCompare(b.name, "da");
}

async function fetchAndSummarize(): Promise<BilinfoSummary> {
  const auth = authHeader();
  if (!auth) return EMPTY_SUMMARY;

  try {
    const res = await fetch(BILINFO_EXPORT_URL, {
      headers: { Authorization: auth, Accept: "application/json" },
      // Svaret er for stort til Next's fetch-cache – vi cacher i stedet det
      // udledte resultat nedenfor via unstable_cache.
      cache: "no-store",
    });
    if (!res.ok) return EMPTY_SUMMARY;

    const data = (await res.json()) as BilinfoExport;
    const cars = dedupeBySource(data.Vehicles ?? []);

    const missingEquipment: CarNeedingWork[] = [];
    const noPictures: CarNeedingWork[] = [];
    const fewPictures: CarNeedingWork[] = [];

    for (const v of cars) {
      if (!hasEquipment(v)) missingEquipment.push(toCar(v));
      const pics = pictureCount(v);
      if (pics === 0) noPictures.push(toCar(v));
      else if (pics <= FEW_PICTURES_MAX) fewPictures.push(toCar(v));
    }

    return {
      ok: true,
      totalCars: cars.length,
      missingEquipment: missingEquipment.sort(byLabel),
      noPictures: noPictures.sort(byLabel),
      fewPictures: fewPictures.sort(byLabel),
    };
  } catch {
    return EMPTY_SUMMARY;
  }
}

/**
 * Cachet indgang – deler det udledte (lille) resultat mellem forside og
 * underside i 30 min, så de 2 MB kun hentes/parses én gang pr. vindue.
 */
const getCachedSummary = unstable_cache(fetchAndSummarize, ["bilinfo-summary-v2"], {
  revalidate: REVALIDATE_SECONDS,
  tags: ["bilinfo"],
});

export async function getBilinfoSummary(): Promise<BilinfoSummary> {
  // Ikke opsat → skip helt (undgå at cache et tomt resultat før env er sat).
  if (!authHeader()) return EMPTY_SUMMARY;
  return getCachedSummary();
}
