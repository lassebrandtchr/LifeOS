/**
 * Farvetemaer – ét fælles register for tema-vælgeren under Indstillinger.
 *
 * Selve farverne bor som CSS-tokens i app/globals.css (blokke pr.
 * data-theme-attribut). Her ligger kun metadata + de få farver som
 * preview-kasserne i tema-vælgeren skal tegne med (previewet kan ikke bruge
 * var(--...), da det skal vise ANDRE temaer end det aktive).
 *
 * "skov" er standard-temaet (ingen data-theme-attribut på <html>).
 */

export const THEME_STORAGE_KEY = "lifeos-color-theme";

export type ThemePreview = {
  /** Sidens baggrund */
  bg: string;
  /** Sidebar-flade (øverste stop i gradienten) */
  sidebar: string;
  /** "Goddag, Lasse"-kassen (CSS-gradient) */
  hero: string;
  /** Brand-/primærfarve (knapper, aktive elementer) */
  primary: string;
  /** Kort-flade */
  card: string;
};

export type ColorTheme = {
  id: "skov" | "navy" | "petrol" | "ametyst" | "bordeaux" | "grafit";
  label: string;
  description: string;
  light: ThemePreview;
  dark: ThemePreview;
};

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: "skov",
    label: "Skov",
    description: "Frisk grøn – standard",
    light: {
      bg: "#eef6ee",
      sidebar: "#dcefdd",
      hero: "linear-gradient(135deg, #0a3a22 0%, #146c3a 60%, #1f8a4c 100%)",
      primary: "#16a34a",
      card: "#ffffff",
    },
    dark: {
      bg: "#0f161e",
      sidebar: "#0c2417",
      hero: "linear-gradient(135deg, #12432b 0%, #1f8f52 55%, #4ae693 100%)",
      primary: "#4ae693",
      card: "#18212d",
    },
  },
  {
    id: "navy",
    label: "Navy",
    description: "Lyseblå & dyb navy",
    light: {
      bg: "#ecf2fb",
      sidebar: "#dbe7f8",
      hero: "linear-gradient(135deg, #081c40 0%, #123068 60%, #1c4691 100%)",
      primary: "#1e56c8",
      card: "#ffffff",
    },
    dark: {
      bg: "#0d1422",
      sidebar: "#0a1830",
      hero: "linear-gradient(135deg, #10305e 0%, #1e56c8 55%, #6aa5ff 100%)",
      primary: "#6aa5ff",
      card: "#161f31",
    },
  },
  {
    id: "petrol",
    label: "Petrol",
    description: "Rolig blågrøn",
    light: {
      bg: "#eaf5f4",
      sidebar: "#d5ecea",
      hero: "linear-gradient(135deg, #083832 0%, #0f6b60 60%, #14897b 100%)",
      primary: "#0d9488",
      card: "#ffffff",
    },
    dark: {
      bg: "#0e181b",
      sidebar: "#06201f",
      hero: "linear-gradient(135deg, #0b4038 0%, #128a76 55%, #2dd4bf 100%)",
      primary: "#2dd4bf",
      card: "#162426",
    },
  },
  {
    id: "ametyst",
    label: "Ametyst",
    description: "Elegant dyb lilla",
    light: {
      bg: "#f2effb",
      sidebar: "#e6def7",
      hero: "linear-gradient(135deg, #2a1360 0%, #4c1d95 60%, #6d3bd8 100%)",
      primary: "#7c3aed",
      card: "#ffffff",
    },
    dark: {
      bg: "#14121f",
      sidebar: "#1c1136",
      hero: "linear-gradient(135deg, #31176b 0%, #6d3bd8 55%, #a78bfa 100%)",
      primary: "#a78bfa",
      card: "#1e1a2e",
    },
  },
  {
    id: "bordeaux",
    label: "Bordeaux",
    description: "Dyb, varm vinrød",
    light: {
      bg: "#faeff1",
      sidebar: "#f4dde2",
      hero: "linear-gradient(135deg, #4a0d20 0%, #7c1533 60%, #a11d3f 100%)",
      primary: "#a11d3f",
      card: "#ffffff",
    },
    dark: {
      bg: "#191014",
      sidebar: "#33101c",
      hero: "linear-gradient(135deg, #571126 0%, #a11d3f 55%, #e0637e 100%)",
      primary: "#e0637e",
      card: "#241820",
    },
  },
  {
    id: "grafit",
    label: "Grafit",
    description: "Eksklusiv stålgrå",
    light: {
      bg: "#f1f3f5",
      sidebar: "#e2e6ea",
      hero: "linear-gradient(135deg, #14181f 0%, #2b3646 60%, #435268 100%)",
      primary: "#334155",
      card: "#ffffff",
    },
    dark: {
      bg: "#101318",
      sidebar: "#171c23",
      hero: "linear-gradient(135deg, #232c38 0%, #46566b 55%, #9fb4cc 100%)",
      primary: "#9fb4cc",
      card: "#191e25",
    },
  },
];

export type ColorThemeId = ColorTheme["id"];

export function isColorThemeId(value: string | null): value is ColorThemeId {
  return COLOR_THEMES.some((t) => t.id === value);
}

/** Sæt temaet på <html> – "skov" (standard) fjerner attributten helt. */
export function applyColorTheme(id: ColorThemeId) {
  const root = document.documentElement;
  if (id === "skov") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", id);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // localStorage kan være blokeret (privat browsing) – temaet virker
    // stadig for sessionen, det huskes bare ikke.
  }
}
