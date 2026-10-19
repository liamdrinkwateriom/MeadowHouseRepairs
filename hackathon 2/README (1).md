# Meadow House Repairs

A browser app for reporting repairs at the fictional Meadow House, tracking progress and keeping a dated history of each job. Plain HTML, CSS and JavaScript. No framework, build step, server, account or API key.

## Run it

Open `index.html` in a browser. Or serve the folder locally:

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

Any static host (GitHub Pages, Netlify and so on) also works, as there is nothing to build.

## Files

- `index.html` – page structure and the repair form
- `logo.svg` – the app logo (also used as the browser tab icon)
- `style.css` – colourful layout and styling (status colours, responsive, visible focus, accessible contrast)
- `app.js` – all behaviour and storage

## What it does

- **Report a repair** with description, reporter name and Normal/Urgent priority. Blank or whitespace-only description or reporter is rejected with an explanation next to the field; valid input is kept.
- A valid report creates a **New** job with a unique ID (`MH-0001`, `MH-0002`, ...), the date and time, the house name Meadow House, and the chosen priority (shown in words, e.g. "Urgent priority").
- **Separate jobs**: each job is its own card and updating one never touches another.
- **Move to In Progress** and **Save progress note** add timestamped entries to the job's history; earlier entries are never removed. The latest note is shown near the top of the card.
- **Mark as Completed** needs a non-blank completion note. A blank attempt is rejected and leaves status, notes and history unchanged.
- **Persistence**: everything is saved in the browser's `localStorage` (key `meadowHouseRepairs.v1`) and survives a refresh.
- **Plain text only**: user text is inserted with `textContent`, so something like `<b>check gate</b>` appears literally and is never run as HTML.

To clear saved data while testing, run `localStorage.removeItem('meadowHouseRepairs.v1')` in the browser console and refresh.

## Accessibility notes

Every control has a visible label, errors are linked to their fields with `aria-describedby` and `aria-invalid`, focus moves to the first invalid field or to the result message after an action, everything works by keyboard, and text meets WCAG AA contrast.

## Data

Fictional data only. Do not enter real care records, names or passwords.
