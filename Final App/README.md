# Meadow House Repairs

A small browser app for reporting repairs at the fictional Meadow House, following their progress and keeping a readable history of what was done. Built for the Omega Digital university hackathon (19 October 2026). All data is fictional.

## Running the app

No installs, build step, server, account or API key is needed.

1. Download or clone this repository.
2. Keep `index.html`, `styles.css` and `app.js` together in the same folder.
3. Double-click `index.html` to open it in a modern browser (Chrome, Edge, Firefox or Safari).

## Using the app

1. **Report a repair:** Enter a description and reporter name, choose Normal or Urgent, then select **Submit report**. A confirmation appears and the job is saved as **New**.
2. **Open a job:** Select **Open job MH-0001** (or the relevant ID) in the job list.
3. **Update a job:** Choose a status (New, In Progress or Completed), type a note, then select **Save update**.
4. **Complete a job:** Choose **Completed** and enter a completion note. A completion note is required.
5. **Review history:** Every job shows its latest note and a dated and timed history. Earlier entries are never removed.

## Features

- Automatic unique job IDs (`MH-0001`, `MH-0002`, ...), automatic date and time, and the fixed house name Meadow House.
- Empty or spaces-only descriptions, reporter names and completion notes are rejected with a clear message. Other typed input is kept.
- A rejected completion leaves the job's earlier status, notes and history unchanged.
- Jobs are independent: updating one never changes another.
- Priority is shown in words ("Urgent priority"), not by colour alone.
- Jobs, priorities, notes, statuses and history survive a page refresh.
- Typed text is always shown as plain text, so `<b>check gate</b>` appears exactly as typed and is never run as HTML.
- Keyboard friendly: every control has a label, focus is visible, errors are linked to their fields, and results are announced to screen readers.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure and the report form |
| `styles.css` | All styling. Colours and fonts are variables at the top |
| `app.js` | All behaviour: saving, validation, job list, job view and history |

## How data is stored

Jobs are saved in the browser's `localStorage` under the key `meadowHouseRepairs.v2`. Data stays in that browser on that computer only, and there is no server or database.

To start fresh, clear the site's data in your browser, or change the `KEY` value near the top of `app.js`.

## Customising

- **Colours and fonts:** edit the variables in the `:root` block at the top of `styles.css`.
- **Statuses, house name and storage key:** edit the SETTINGS section at the top of `app.js`.
- **Error and confirmation wording:** these are plain text strings in `app.js`.

## Quick manual test

1. Submit "Garden fence damaged", reporter "Alex Morgan", priority Urgent. A New job appears with its ID, date, Meadow House and "Urgent priority".
2. Try an empty description, then spaces only. No job is created and an error is shown. Repeat for the reporter name.
3. Add a second job, "Kitchen light flickering", priority Normal.
4. Open the fence job, set In Progress, add the note "Temporary barrier fitted" and save. Check the kitchen-light job is unchanged.
5. Try to complete the fence job with no note, then spaces only. Both are rejected and nothing is lost.
6. Complete it with "Fence repaired and checked". Completed and the note show together, and earlier history remains.
7. Refresh the page. Both jobs keep their own details.
8. Report a job containing `<b>check gate</b>`. It shows as literal text.

## Limitations

- Data lives only in one browser, so it is not shared between devices or people.
- There are no accounts, photos, costs, scheduling or staff assignment (not required by the brief).
- A completed job cannot be reopened.
