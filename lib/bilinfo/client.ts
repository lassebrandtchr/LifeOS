import "server-only";

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
 * Bruges KUN til forsidens Arbejdsoverblik. Credentials sættes via env
 * (BILINFO_USERNAME / BILINFO_PASSWORD) og sendes som Basic auth.
 *
 * Next.js' fetch-cache (revalidate: 30 min) sørger for, at vi højst
 * henter feedet én gang hvert halve minut… nej, hver halve time – uden
 * noget separat cron-job. Feedet ændrer sig sjældent oftere.
 */

const BILINFO_EXPORT_URL = "https://gw.bilinfo.net/listingapi/api/export";
const REVALIDATE_SECONDS = 30 * 60;

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

/**
 * Kort genkendelses-kode: de sidste 5 cifre af Bilinfo-annonce-id'et.
 * Feedet indeholder IKKE stelnummer/VIN, så dette er den nærmeste
 * stabile identifikator, en medarbejder kan slå op i Bilinfo.
 */
function shortCode(v: BilinfoVehicle): string {
  const digits = (v.Id ?? "").replace(/\D/g, "");
  if (!digits) return "–";
  return digits.slice(-5).padStart(5, "0");
}

function toCar(v: BilinfoVehicle): CarNeedingWork {
  return {
    key: v.VehicleSourceId ?? v.VehicleId ?? v.Id ?? Math.random().toString(36),
    code: shortCode(v),
    make: v.Make ?? "",
    model: v.Model ?? "",
    variant: v.Variant ?? "",
    year: v.Year ?? "",
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
  return `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`, "da");
}

export async function getBilinfoSummary(): Promise<BilinfoSummary> {
  const auth = authHeader();
  if (!auth) return EMPTY_SUMMARY;

  try {
    const res = await fetch(BILINFO_EXPORT_URL, {
      headers: { Authorization: auth, Accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS },
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
      else if (pics <= 10) fewPictures.push(toCar(v));
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
