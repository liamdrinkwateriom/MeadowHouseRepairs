# Meadow House Repairs

A small browser app for reporting repairs at the fictional **Meadow House**, following each repair's progress, and keeping a dated history of what was done.

There is no build step, no framework, no server and no account system. It uses plain HTML, CSS and JavaScript, and saves data in the browser's `localStorage`.

## Run it

**Easiest:** double-click `index.html` to open it in a browser.

**Or, with a local web server** (any of these, from this folder):

```bash
python3 -m http.server 8000     # then open http://localhost:8000
# or
npx serve .
```

## How to use it

1. Fill in **Description**, **Reporter name** and **Priority** (Normal or Urgent), then press **Submit repair report**. A new job appears with status **New**.
2. On a job card, press **Move to In Progress**, then add a **Progress note** and press **Save progress note**.
3. To finish a job, type a **Completion note** and press **Mark as Completed**. A completion note is required.
4. Every change adds a dated and timed entry to the job's **History**. Earlier entries are never removed.
5. Refresh the page: all jobs, notes, statuses and history are still there.

## Project structure

```
index.html          Page structure only
css/
  styles.css        All styling (colour tokens at the top)
js/
  config.js         Fixed values: house name, priorities, statuses, limits
  validation.js     Rules for blank/whitespace input and the error messages
  jobs.js           Job rules: create, move to In Progress, add note, complete
  storage.js        Saving/loading to localStorage (with safe fallbacks)
  format.js         Date/time formatting helpers
  dom.js            Safe element builder + field-error helpers
  ui-form.js        The "Report a repair" form
  ui-jobs.js        Job cards, the update forms and the history list
  app.js            Starts the app and connects everything together
```

Scripts are loaded in dependency order by `index.html`, and share one global object, `window.MeadowHouse`.

## Design decisions

- **Jobs are independent.** Each update function takes one job and returns a new copy. Only that job is replaced in the list, and each job owns its own history array.
- **Failed updates change nothing.** A blank completion note is rejected before anything is changed, so the earlier status, notes and history stay intact.
- **Typed text stays plain.** Text is only ever inserted with `textContent`. The code never uses `innerHTML`, so something like `<b>check gate</b>` is displayed exactly as typed and never run.
- **Blank means blank.** Empty, whitespace-only and zero-width-character-only input is rejected for the description, the reporter name and both notes.
- **Accessibility.** Every control has a visible label; errors are linked to their field with `aria-describedby`; focus moves to the first problem field or to a named confirmation message; focus rings are always visible; colours meet WCAG AA contrast.

## Data and privacy

Use fictional people and data only. Jobs are stored in this browser under the key `meadowHouseRepairs.v1`. To reset the app, clear the site's data in your browser (or run `localStorage.removeItem('meadowHouseRepairs.v1')` in the console).
