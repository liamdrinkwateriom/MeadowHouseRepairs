/**
 * storage.js
 * ---------------------------------------------------------------
 * Saves and loads jobs using the browser's localStorage so they
 * survive a page refresh. No server or database is needed.
 *
 * Everything is wrapped in try/catch because localStorage can be
 * unavailable (private browsing, blocked cookies, full quota). The app
 * keeps working in that case and shows a warning instead of crashing.
 */
(function (global) {
  'use strict';

  const MH = global.MeadowHouse;
  const { STORAGE_KEY, STATUS, PRIORITIES, HOUSE_NAME } = MH.config;

  /** Basic shape check so one damaged record cannot break the whole page. */
  function looksLikeJob(value) {
    return (
      value !== null &&
      typeof value === 'object' &&
      typeof value.id === 'string' &&
      typeof value.description === 'string' &&
      typeof value.reporter === 'string' &&
      PRIORITIES.indexOf(value.priority) !== -1 &&
      Object.values(STATUS).indexOf(value.status) !== -1 &&
      Array.isArray(value.history)
    );
  }

  /** Fill in any optional fields that might be missing from saved data. */
  function normalise(job) {
    return Object.assign(
      { house: HOUSE_NAME, createdAt: null, completedAt: null, completionNote: null },
      job
    );
  }

  /**
   * Load all saved jobs.
   * @returns {{jobs:Object[], ok:boolean}}  ok=false means saved data could not be read.
   */
  function load() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        return { jobs: [], ok: true }; // first visit: nothing saved yet
      }

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (parseError) {
        // Keep a copy of the unreadable data rather than silently destroying it.
        global.localStorage.setItem(STORAGE_KEY + '.unreadable', raw);
        return { jobs: [], ok: false };
      }

      if (!Array.isArray(parsed)) {
        return { jobs: [], ok: false };
      }
      return { jobs: parsed.filter(looksLikeJob).map(normalise), ok: true };
    } catch (error) {
      return { jobs: [], ok: false };
    }
  }

  /**
   * Save all jobs.
   * @returns {boolean} true if saved, false if the browser refused.
   */
  function save(jobs) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
      return true;
    } catch (error) {
      return false;
    }
  }

  MH.storage = { load: load, save: save };
})(window);
