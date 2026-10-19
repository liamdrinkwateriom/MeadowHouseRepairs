/**
 * app.js
 * ---------------------------------------------------------------
 * The "glue" file. It:
 *   1. holds the list of jobs in memory,
 *   2. saves that list to localStorage after every successful change,
 *   3. gives the two UI files (form and job cards) a small set of
 *      actions they can call,
 *   4. starts everything when the page loads.
 *
 * Only the job being changed is replaced in the list, so editing one
 * job can never alter another.
 */
(function (global) {
  'use strict';

  const MH = global.MeadowHouse;

  /** All jobs, oldest first (the UI shows them newest first). */
  let jobs = [];

  const noticeEl = document.getElementById('storage-notice');

  /** Show or hide the banner that warns when saving is not possible. */
  function showStorageNotice(message) {
    noticeEl.textContent = message || '';
    noticeEl.hidden = !message;
  }

  /** Save to localStorage and warn the person if the browser refuses. */
  function persist() {
    const saved = MH.storage.save(jobs);
    showStorageNotice(
      saved
        ? ''
        : 'Your changes could not be saved in this browser (storage may be blocked or full). They will be lost if you refresh the page.'
    );
  }

  /** Find a job by ID (returns undefined if it does not exist). */
  function getJob(id) {
    return jobs.find(function (job) { return job.id === id; });
  }

  /**
   * Apply an update function to ONE job.
   * `change` receives the current job and returns {ok:true, job} or {ok:false, ...}.
   * Only when ok is true is that single job replaced and the list saved.
   */
  function updateJob(id, change) {
    const index = jobs.findIndex(function (job) { return job.id === id; });
    if (index === -1) {
      return { ok: false, kind: 'state', error: 'That job could not be found.' };
    }
    const result = change(jobs[index]);
    if (result.ok) {
      jobs[index] = result.job; // replace just this job
      persist();
    }
    return result;
  }

  // Actions used by the job cards (ui-jobs.js).
  const jobActions = {
    getJobs: function () { return jobs; },
    getJob: getJob,
    startWork: function (id) {
      return updateJob(id, function (job) { return MH.jobs.startWork(job); });
    },
    addProgressNote: function (id, text) {
      return updateJob(id, function (job) { return MH.jobs.addProgressNote(job, text); });
    },
    completeJob: function (id, text) {
      return updateJob(id, function (job) { return MH.jobs.completeJob(job, text); });
    }
  };

  // Action used by the report form (ui-form.js).
  const formActions = {
    submitReport: function (values) {
      const result = MH.jobs.createJob(jobs, values);
      if (result.ok) {
        jobs.push(result.job);
        persist();
        MH.ui.jobs.addCard(result.job);
      }
      return result;
    }
  };

  /** Start the app: load saved jobs, then wire up and draw the page. */
  function start() {
    const loaded = MH.storage.load();
    jobs = loaded.jobs;
    if (!loaded.ok) {
      showStorageNotice('Saved repair data could not be read in this browser, so the list may be incomplete.');
    }

    MH.ui.jobs.init(jobActions);
    MH.ui.form.init(formActions);
    MH.ui.jobs.renderAll();

    // If the app is open in two tabs, keep this tab in step when the other one saves.
    global.addEventListener('storage', function (event) {
      if (event.key === MH.config.STORAGE_KEY) {
        jobs = MH.storage.load().jobs;
        MH.ui.jobs.renderAll();
      }
    });
  }

  start();
})(window);
