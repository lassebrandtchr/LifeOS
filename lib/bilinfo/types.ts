/**
 * Typer for Bilinfo Listing API V.3 – kun de felter forsidens
 * "mangler-oversigt" faktisk bruger. Den fulde vogn har 100+ felter
 * (se Bilinfo-dokumentationen); vi holder typen bevidst lille og
 * defensiv, da alle felter kommer som strenge og kan mangle.
 */

/** Rå vogn fra Bilinfo-feedet (kun de felter vi læser). */
export type BilinfoVehicle = {
  /** Legacy-id (numerisk annonce-id). Bruges KUN som kort genkendelses-
   *  kode, da feedet ikke indeholder stelnummer/VIN. */
  Id?: string;
  /** Unikt id for den enkelte annonce (kan være flere pr. bil). */
  VehicleId?: string;
  /** Unikt id for selve bilen – samme bil kan have flere annoncer
   *  (fx både kontant- og leasingpris). Bruges til at tælle unikke biler. */
  VehicleSourceId?: string;
  Make?: string;
  Model?: string;
  Variant?: string;
  Year?: string;
  Comment?: string;
  EquipmentList?: string[];
  ExtraEquipmentList?: string[];
  PictureCount?: string;
  Pictures?: string[];
};

export type BilinfoExport = {
  ApiVersion?: string;
  VehicleCount?: number;
  Vehicles?: BilinfoVehicle[];
};

/** En bil der mangler noget – klar til visning i oversigten. */
export type CarNeedingWork = {
  /** Nøgle til React-lister (VehicleSourceId eller Id). */
  key: string;
  /** Kort genkendelses-kode: de sidste 5 cifre af Bilinfo-annonce-id'et.
   *  (Bilinfo-feedet indeholder IKKE stelnummer/VIN, så dette er den
   *  nærmeste stabile identifikator.) */
  code: string;
  make: string;
  model: string;
  variant: string;
  year: string;
  pictureCount: number;
};

/** Samlet resultat til forsidens Arbejdsoverblik. */
export type BilinfoSummary = {
  /** true hvis feedet blev hentet uden fejl (ellers skjules sektionen). */
  ok: boolean;
  /** Antal unikke biler i feedet. */
  totalCars: number;
  /** Biler helt uden udstyrsliste (hverken standard- eller ekstraudstyr). */
  missingEquipment: CarNeedingWork[];
  /** Biler helt uden billeder (0 billeder). */
  noPictures: CarNeedingWork[];
  /** Biler med 1–10 billeder – mangler professionelle billeder. */
  fewPictures: CarNeedingWork[];
};
