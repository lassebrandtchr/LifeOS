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
  Color?: string;
  Mileage?: string;
  Price?: string;
  CashPrice?: string;
  LeasingPrice?: string;
  PriceType?: string;
  Comment?: string;
  EquipmentList?: string[];
  ExtraEquipmentList?: string[];
  PictureCount?: string;
  Pictures?: string[];
  /** "DD-MM-YYYY HH:MM:SS" – bruges til at afgøre hvilken af flere annoncer
   *  for samme bil (kontant/leasing) der er den nyeste/mest opdaterede. */
  ModifiedDate?: string;
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
  /** Bilens fulde navn: mærke + model + variant, fx "Audi TT V6 Coupé". */
  name: string;
  /** Årgang (tom hvis ukendt). */
  year: string;
  /** Farve, fx "Gråmetal" (tom hvis ukendt). */
  color: string;
  /** Formateret pris, fx "448.480 kr." eller "Ring for pris". */
  price: string;
  /** Formateret km-stand, fx "55.000 km" (tom hvis ukendt). */
  mileage: string;
  /** Antal billeder på annoncen. */
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
  /** Biler med 0–1 billeder – mangler billeder. */
  noPictures: CarNeedingWork[];
  /** Biler med 2–14 billeder – mangler professionelle billeder. */
  fewPictures: CarNeedingWork[];
};
