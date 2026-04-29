---
title: Password eye, city suggest, char hints, better address search
---
# Form UX: eye icon, city suggest, char hints, address search

## What & Why
Several form usability gaps need closing to meet the tech spec and improve the user experience:
- Password fields have no way to reveal what was typed — users mistype passwords without realising it
- The city field in the quest creation form is a plain text box, but a CityAutocomplete component already exists in the codebase and is unused there
- The quest title and description validation minimums in new.tsx don't match the spec (name ≥5, description ≥30) and there are no visible character counters to guide the user before they hit submit
- The checkpoint location search in the editor only geocodes on button press and the prefix "Нижний Новгород, " blocks finding streets and other non-landmark places; adding a suggest-style dropdown (like CityAutocomplete does) would return all map objects

## Done looks like
- On the login and registration pages, a password field shows dots by default; clicking the eye icon toggles visibility to plain text and back
- On the new quest form, typing in the "Город" field opens a dropdown with Yandex Maps suggestions, same behaviour as CityAutocomplete
- Under the quest title field (new.tsx) a live counter reads "N / 5 символов" and shows red when below minimum
- Under the quest description field (new.tsx) a live counter reads "N / 30 символов" and shows red when below minimum
- The `minLength` validation on both fields is updated to 5 and 30 respectively (both in the Zod schema and HTML attributes)
- In the checkpoint location picker (edit.tsx CheckpointPicker), typing an address shows a dropdown of autocomplete suggestions via `ymaps.suggest()`; selecting one moves the map marker; the search no longer prepends "Нижний Новгород" so all cities and street-level objects are found

## Out of scope
- Changing any server-side validation rules
- Adding character counters to the checkpoint task/name fields (separate task #10 already covers that)
- City autocomplete on the registration form (no city field there)

## Steps
1. **Password eye toggle** — Add a show/hide button to the password `<Input>` in login.tsx and register.tsx using an Eye / EyeOff icon from lucide-react; toggle input type between "password" and "text" via local state
2. **City autocomplete in new.tsx** — Replace the plain `<Input>` city field with the existing `CityAutocomplete` component; wire up the `value` / `onChange` props
3. **Quest form char-count hints** — In new.tsx, update the Zod schema minLength for title to 5 and description to 30; below each field add a small `<p>` showing "N / 5 символов" or "N / 30 символов" in muted text that turns destructive when below the limit; set `minLength` HTML attrs accordingly
4. **Suggest-style address autocomplete in CheckpointPicker** — Replace the geocode-on-button-press approach with a dropdown: as the user types, call `ymaps.suggest(query, { results: 6 })` with a 250 ms debounce; show suggestions in a dropdown list; on selecting a suggestion call `ymaps.geocode(suggestion.value, { results: 1 })` to get coordinates and move the marker; remove the "Нижний Новгород, " prefix from the geocode call

## Relevant files
- `artifacts/morizo/src/pages/auth/login.tsx`
- `artifacts/morizo/src/pages/auth/register.tsx`
- `artifacts/morizo/src/pages/quests/new.tsx`
- `artifacts/morizo/src/pages/quests/edit.tsx`
- `artifacts/morizo/src/components/city-autocomplete.tsx`