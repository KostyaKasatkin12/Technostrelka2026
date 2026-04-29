# Quest PDF / Print Page

## What & Why
Players want to download or print a quest before heading out, so they can follow it offline without a data connection. A print-optimised page (triggered from the quest detail) renders the quest title, description, rules, and all checkpoint names + task text in a clean layout. Answers are never revealed.

## Done looks like
- A "Скачать / Распечатать" button appears on the quest detail page for every published quest
- Clicking it opens a print-ready view (either `window.print()` or a generated PDF download)
- The printed/exported page shows: quest title, cover image, district & difficulty, rules, and each checkpoint in order with its name, task text, hint (if any), and a blank "Answer" line for the player to fill in on paper
- No code answers or choice-answer indices are ever included
- The print layout hides navigation, buttons, and other UI chrome via `@media print` CSS

## Out of scope
- Server-side PDF rendering (pure client-side print/export only)
- Answers or checkpoint coordinates in the export

## Steps
1. **Print stylesheet** — Add `@media print` rules to the app CSS or a dedicated component that hides nav, sidebars, and interactive elements
2. **PrintableQuest component** — A read-only React component that receives quest + checkpoints data and renders them in a clean vertical layout (logo, title, meta, rules, then numbered checkpoint cards each with name, task text, and a ruled blank line)
3. **Trigger button on detail page** — Add the button to the quest detail header/actions area; on click, render the printable component in a new tab or hidden `<div>` then call `window.print()`
4. **Checkpoint ordering and answer suppression** — Ensure checkpoints are sorted by `orderIndex` and that `codeAnswer` / `choiceAnswerIndex` are never passed to the component (they are already stripped by the backend for non-authors)

## Relevant files
- `artifacts/morizo/src/pages/quests/detail.tsx`
- `artifacts/morizo/src/components/quest-map.tsx`
- `artifacts/morizo/src/index.css`
