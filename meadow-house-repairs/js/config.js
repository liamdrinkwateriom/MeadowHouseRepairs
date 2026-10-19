/**
 * config.js
 * ---------------------------------------------------------------
 * Central place for the app's fixed values (names, limits, keys).
 * Every other file reads from here, so a value only ever needs
 * changing in one place.
 *
 * All scripts share one global namespace, `window.MeadowHouse`,
 * so the app works when index.html is simply double-clicked
 * (no build step, no web server and no ES-module CORS problems).
 */
(function (global) {
  'use strict';

  const MH = (global.MeadowHouse = global.MeadowHouse || {});

  MH.config = Object.freeze({
    // The brief fixes the house name: every job belongs to Meadow House.
    HOUSE_NAME: 'Meadow House',

    // Key under which all jobs are saved in the browser's localStorage.
    // The ".v1" suffix lets a future version change the data shape safely.
    STORAGE_KEY: 'meadowHouseRepairs.v1',

    // Job IDs look like MH-0001, MH-0002 ...
    ID_PREFIX: 'MH-',

    // The two priorities allowed by the brief.
    PRIORITIES: Object.freeze(['Normal', 'Urgent']),

    // The three states a job moves through: New -> In Progress -> Completed.
    STATUS: Object.freeze({
      NEW: 'New',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed'
    }),

    // Maximum lengths (characters). Long enough for the 200-character
    // readability check in the brief, short enough to keep cards tidy.
    LIMITS: Object.freeze({
      description: 500,
      reporter: 80,
      note: 500
    }),

    // Used when formatting dates and times for display.
    LOCALE: 'en-GB'
  });
})(window);
