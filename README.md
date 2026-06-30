# LifeOS

Dit personlige AI-styresystem – privatliv og Storgaard Biler samlet i ét premium-interface.

> **Status:** Fase 2 (teknisk fundament) er bygget. Login, database og AI-agenter kommer i senere faser.

---

## Sådan starter du appen (for begyndere)

Åbn en terminal i denne mappe (`lifeos`) og kør:

```bash
npm run dev
```

Åbn derefter **http://localhost:3000** i din browser. Du ser nu LifeOS-dashboardet.

For at stoppe serveren: tryk `Ctrl + C` i terminalen.

Andre kommandoer:

| Kommando        | Hvad den gør                                       |
| --------------- | -------------------------------------------------- |
| `npm run dev`   | Starter appen lokalt (til udvikling)               |
| `npm run build` | Bygger en produktionsversion (tjekker for fejl)    |
| `npm run start` | Kører den byggede produktionsversion               |
| `npm run lint`  | Tjekker koden for fejl og dårlige mønstre          |

---

## Teknologi

- **Next.js 16** (App Router) – *bemærk:* nyeste version, som afløser den i planen nævnte v15.
- **TypeScript** – sikrere kode.
- **Tailwind CSS v4** – styling via design tokens.
- **shadcn/ui** – genbrugelige UI-komponenter.
- **Framer Motion** – bløde animationer.
- **Supabase** – database + login (forberedt, ikke aktiveret endnu).
- **next-themes** – light/dark mode.
- **PWA** – kan installeres på iPhone, iPad og desktop.

---

## Mappestruktur (kort)

```
app/            Sider og ruter (Next.js App Router)
  (app)/        Det "indre" af appen – får sidebar, topbar og mobilmenu
components/     UI-komponenter (ui, layout, cards, dashboard ...)
config/         Navigation og global app-konfiguration
hooks/          Genbrugelige React-hooks
lib/            Hjælpefunktioner + Supabase-klienter
types/          TypeScript-typer
supabase/       Database-migrationer (kommer senere)
agents/         AI-agenter (kommer senere)
proxy.ts        Kører før hver side (afløser for "middleware")
```

---

## Miljøvariabler

Hemmelige nøgler bor i `.env.local` (deles ikke på git).
Se `.env.example` for hvilke nøgler der skal bruges. I Fase 2 er alt pladsholdere.
