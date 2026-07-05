/**
 * Idé-generator til Marketing-siden – konkrete, sæsonbevidste content-idéer
 * for en bilforhandler (Storgaard Biler). Ren logik, ingen AI-kald:
 * puljen roterer deterministisk pr. uge (samme uge = samme forslag), og
 * "Nye idéer"-knappen blander videre i puljen.
 */

export type ContentIdea = {
  title: string;
  body: string;
  kind: "video" | "opslag" | "kampagne";
  /** Måneder (1-12) hvor idéen er mest relevant – tom = hele året. */
  months?: number[];
};

const IDEAS: ContentIdea[] = [
  // ── Hele året: biler & hverdag ──
  { title: "Ugens bil – 60 sekunders rundtur", body: "Kort video: gå rundt om ugens udvalgte bil, vis 3 detaljer folk ellers overser (kabine, bagagerum, udstyr). Slut med pris og et enkelt call-to-action.", kind: "video" },
  { title: "Før/efter klargøring", body: "Split-billede eller timelapse af en bil før og efter klargøring. Folk ELSKER transformationer – og det viser jeres standard.", kind: "video" },
  { title: "Dagens indkommer", body: "Hurtigt opslag når en ny bil lander: 3 billeder, 3 linjer, 'først til mølle'. Skaber vane hos følgerne: tjek Storgaard hver dag.", kind: "opslag" },
  { title: "Kunden overtager nøglerne", body: "Billede af glad kunde ved afhentning (med samtykke). Autentisk socialt bevis – bed kunden dele opslaget.", kind: "opslag" },
  { title: "Bag om Storgaard – en dag på pladsen", body: "Vis hverdagen: bilerne der ankommer, klargøring, prøvekørsler. Mennesker handler af mennesker.", kind: "video" },
  { title: "3 ting du SKAL tjekke ved brugtbilskøb", body: "Kort ekspertvideo: servicebog, rust, prøvekørsel. Positionerer Lasse som den ærlige bilekspert i Bramming.", kind: "video" },
  { title: "Hvad er din bil værd?", body: "Opslag: 'Send os reg-nummer, og få en gratis vurdering inden weekenden.' Genererer leads direkte i indbakken.", kind: "kampagne" },
  { title: "Myte-mandag", body: "Afliv en bilmyte hver mandag ('Automatgear bruger mere brændstof' osv.). Fast serie = faste seere.", kind: "opslag" },
  { title: "Quiz: Gæt prisen", body: "Vis en bil, lad følgerne gætte prisen i kommentarfeltet. Vinderen får en gratis vask/klargøring. Kæmpe engagement.", kind: "opslag" },
  { title: "Kundens spørgsmål – ærligt svar", body: "Tag et rigtigt kundespørgsmål fra ugen ('Er leasing noget for mig?') og svar på 45 sekunder.", kind: "video" },
  { title: "Finansiering forklaret på 1 minut", body: "Simpel video: hvad koster en bil til 150.000 kr. om måneden? Fjern skrækken for tallet – flere henvendelser.", kind: "video" },
  { title: "Ugens hurtigste bil på pladsen", body: "Lidt kant: vis den sjoveste/hurtigste/mest specielle bil på lager lige nu. Deles bredt af bilnørder.", kind: "opslag" },

  // ── Sæson: forår ──
  { title: "Forårsklar bil: 5-punkts tjekliste", body: "Dækskifte, sprinklervæske, aircon, vask, lygter. Del som karrusel-opslag – gem-venligt indhold.", kind: "opslag", months: [3, 4, 5] },
  { title: "Cabriolet-sæsonen er åben", body: "Har I en cabriolet/targa på lager? Solskinsvideo + 'sommeren starter her'. Timing sælger.", kind: "opslag", months: [4, 5, 6] },
  { title: "Studenterkørsel-kampagne", body: "Kampagne mod foráldre: 'Første bil til studenten – sikre biler under 100.000 kr.' Kør den i maj-juni.", kind: "kampagne", months: [4, 5, 6] },

  // ── Sæson: sommer ──
  { title: "Ferieklar: pak bilen rigtigt", body: "Video: tagboks, trailere, dæktryk med fuld last. Praktisk indhold lige før ferien = delinger.", kind: "video", months: [6, 7] },
  { title: "Roadtrip-biler under 150.000", body: "Karrusel: 3-5 biler fra lageret der er perfekte til sommerferien. Direkte salgsvinkel med sæsonkrog.", kind: "opslag", months: [6, 7, 8] },

  // ── Sæson: efterår ──
  { title: "Vinterdæk-reminder med personlighed", body: "Humoristisk opslag når første nattefrost rammer: 'Din bil har også brug for vintersko.' Book dækskifte-CTA.", kind: "opslag", months: [9, 10, 11] },
  { title: "Efterårsmørke: lygtetjek-video", body: "Vis hvordan man selv tjekker alle lygter på 2 minutter. Tilbyd gratis lygtetjek ved besøg.", kind: "video", months: [9, 10, 11] },

  // ── Sæson: vinter ──
  { title: "Vinterklar bil: 5 hurtige råd", body: "Batteri, dæk, sprinklervæske med frostvæske, isskraber, nødkit. Årets mest gemte opslag.", kind: "opslag", months: [11, 12, 1, 2] },
  { title: "Årsskifte: skal bilen skiftes i år?", body: "Kampagne i januar: 'Nyt år, ny bil – vi giver en fair pris for din gamle.' Januarkøbere er beslutsomme.", kind: "kampagne", months: [12, 1] },
  { title: "Sne-content: bilerne i vinterdragt", body: "Stemningsbilleder af pladsen i sne. Blødt indhold der bygger brand mellem salgsopslagene.", kind: "opslag", months: [12, 1, 2] },
];

/** Deterministisk uge-nøgle (ISO-agtig): år*100 + uge. */
function weekSeed(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const week = Math.floor((date.getTime() - start.getTime()) / (7 * 86_400_000));
  return date.getFullYear() * 100 + week;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ugens idéer: sæson-relevante først, blandet deterministisk pr. uge.
 * `shuffle` (0, 1, 2 …) blander videre – bruges af "Nye idéer"-knappen.
 */
export function weeklyIdeas(count = 3, shuffle = 0, now = new Date()): ContentIdea[] {
  const month = now.getMonth() + 1;
  const inSeason = IDEAS.filter((i) => !i.months || i.months.includes(month));
  const rand = mulberry32(weekSeed(now) + shuffle * 7919);
  const pool = [...inSeason];
  // Fisher-Yates med seeded RNG
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
