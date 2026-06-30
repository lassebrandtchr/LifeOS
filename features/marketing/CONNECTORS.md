# Marketing Workspace – connector-klar arkitektur

Marketing Workspace (Fase 10) er **100% regelbaseret og virker uden AI eller
eksterne integrationer**. Men datamodellen er bevidst designet, så connectors kan
kobles på **senere uden at ændre resten af systemet** – og uden at bygge dobbelt
funktionalitet.

## Princip

LifeOS har allerede et connector-lag (`features/integrations/*` + Integration
Center). Marketing-connectors skal genbruge det samme mønster:

1. **Connector først** – findes der en connector (fx via assistentens
   connector-værktøjer), bruges den.
2. **Officielt API** – ellers et officielt API (Meta Graph API, TikTok API,
   Google Business Profile API, Mailchimp m.fl.).
3. **Egen integration** – ellers en egen, isoleret integration.
4. **Midlertidig løsning** – indtil videre: manuel indtastning i workspace'et.

## Hvor data lander

Tabellerne har allerede de felter, en connector skal bruge — så en fremtidig
synk er ren udfyldning, ikke et skema-skift:

| Connector (fremtid) | Skriver til | Felter der bruges |
|---|---|---|
| Meta / Facebook / Instagram | `marketing_events` | `type`, `platform`, `event_date`, `done`, **`source`**, **`external_id`** |
| TikTok | `marketing_events` | samme |
| Google Business / Nyhedsbrev | `marketing_events` | samme |
| Drive / Dropbox (medier) | `marketing_media` | `type`, `url`, **`source`**, **`external_id`** |
| Annonceplatforme (KPI) | afledes i `features/marketing/queries.ts` | tæller `marketing_events` / `marketing_media` |

`source` + `external_id` muliggør dedup ved gentagen synk (præcis som
`tasks.notion_id`, `calendar_events.external_id` og `emails.external_id` i
resten af LifeOS).

## Hvad der IKKE skal bygges dobbelt

- **Opgaver** genbruger `tasks` (kategori = markedsføring / sociale medier) +
  `tasks.campaign_id`. Der er bevidst *ikke* et separat marketing-opgavesystem.
- **Filupload** kan genbruge den eksisterende Supabase Storage-opsætning
  (`task-attachments`-mønstret fra migration 0008), hvis ægte filhosting ønskes.
- **Connector-tænd/sluk** hører hjemme i det eksisterende Integration Center –
  marketing-connectors registreres dér, ikke i et nyt parallelt UI.

## Implementeringsskridt senere (uden at røre UI'et)

1. Tilføj connector-definition(er) i `features/integrations/registry.ts`.
2. Tilføj en `syncMarketing*`-action i `features/integrations/actions.ts`, der
   skriver til `marketing_events` / `marketing_media` med `source` + `external_id`.
3. Workspace'et viser automatisk de synkede rækker — ingen ændringer i
   komponenterne nødvendige.
