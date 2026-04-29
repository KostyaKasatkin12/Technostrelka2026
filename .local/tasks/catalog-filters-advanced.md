# Quest Catalog: Difficulty Groups, Duration & Near-Me Filters

## What & Why
The catalog currently supports travel-mode filtering and search, but lacks the three specific filter types the users need: a friendly difficulty picker (non-numeric labels), a duration range, and a geolocation-based "near me" toggle. These are the most-requested discovery tools for teens browsing quests in Nizhny Novgorod.

## Done looks like
- A filter bar above the quest grid has three controls that work together with the existing travel-mode and search filters:
  1. **Difficulty** — three chips/buttons: "мне только спросить" (difficulty 1–2), "я бы ещё поиграл" (difficulty 3), "работают профи" (difficulty 4–5). Selecting one passes `difficultyMin`/`difficultyMax` to the API (params already exist on the server).
  2. **Длительность** — dropdown or chips: "до 30 мин", "30–60 мин", "60+ мин". Server gains `durationMax` and `durationMin` query params that filter by `durationMin` column.
  3. **Рядом со мной** — toggle button that calls `navigator.geolocation.getCurrentPosition`, then filters the current page results client-side using Haversine distance (earth-radius calc, no PostGIS needed). Show a configurable radius label (e.g. "в 3 км").
- Active filters are reflected in URL search params so the URL is shareable.
- Clearing any filter reverts to the full set; all filters compose together.

## Out of scope
- Sorting (already in task #25 scope)
- Full-text search changes
- City filter (already exists)

## Steps
1. **Server — add duration filter params** — Add `durationMin` and `durationMax` as optional integer query params to the list-quests OpenAPI spec and to the server handler; apply `gte`/`lte` conditions on `questsTable.durationMin` when present. Run codegen after.
2. **Catalog UI — difficulty chips** — Replace or extend existing filter row with three labelled difficulty chips. Map each chip to `{difficultyMin, difficultyMax}` values sent to `useListQuests`.
3. **Catalog UI — duration chips** — Add duration chip set (≤30, 30-60, 60+) wired to the new server params.
4. **Catalog UI — near-me toggle** — On click, request geolocation permission, store `{lat, lng}` in state, and client-side filter the returned quest list by Haversine distance ≤ 3 km using `quest.lat` / `quest.lng` fields (add those to the quest DTO if missing). Show distance on each card when filter is active.
5. **URL persistence** — Sync all filter state to URL search params (difficulty, duration, nearMe) alongside existing `page` and `travel_mode` params.

## Relevant files
- `artifacts/morizo/src/pages/quests/catalog.tsx`
- `artifacts/api-server/src/routes/quests.ts:50-110`
- `lib/api-spec/openapi.yaml`
- `lib/api-client-react/src/generated/api.ts`
