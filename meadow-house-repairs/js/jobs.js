/**
 * jobs.js
 * ---------------------------------------------------------------
 * The "business rules" for repair jobs: creating a job, moving it to
 * In Progress, saving progress notes and completing it.
 *
 * Design rules that keep jobs independent of each other:
 *   - Every function takes ONE job and returns a NEW job object.
 *     The original is never modified, so a failed update (for example a
 *     blank completion note) cannot damage the saved status, notes or
 *     history.
 *   - Each job owns its own `history` array; nothing is shared.
 *
 * This file does not touch the page or storage. app.js does that.
 *
 * A job looks like this:
 *   {
 *     id: 'MH-0001', house: 'Meadow House',
 *     description, reporter, priority: 'Normal' | 'Urgent',
 *     status: 'New' | 'In Progress' | 'Completed',
 *     createdAt: ISO date string,
 *     completedAt: ISO date string | null,
 *     completionNote: string | null,
 *     history: [ { type, at, ... } ]      // oldest entry first
 *   }
 *
 * History entry types:
 *   'created'   { at, status }
 *   'status'    { at, from, to }
 *   'note'      { at, note }
 *   'completed' { at, from, to, note }
 */
(function (global) {
  'use strict';

  const MH = global.MeadowHouse;
  const { HOUSE_NAME, ID_PREFIX, STATUS } = MH.config;
  const { validateReport, validateNote } = MH.validation;

  /** Current time as an ISO string (a Date can be passed in for tests). */
  function stamp(now) {
    return (now instanceof Date ? now : new Date()).toISOString();
  }

  /**
   * Automatic unique ID: one higher than the largest existing number.
   * Because jobs are never deleted, IDs are never reused, even after a
   * page refresh.
   */
  function nextId(existingJobs) {
    let highest = 0;
    existingJobs.forEach(function (job) {
      const match = new RegExp('^' + ID_PREFIX + '(\\d+)$').exec(job.id);
      if (match) {
        highest = Math.max(highest, parseInt(match[1], 10));
      }
    });
    return ID_PREFIX + String(highest + 1).padStart(4, '0');
  }

  /** Copy a job's history so the new job never shares an array with the old one. */
  function copyHistory(job) {
    return job.history.map(function (entry) {
      return Object.assign({}, entry);
    });
  }

  /**
   * Create a brand-new job from the report form.
   * @returns {{ok:true, job:Object} | {ok:false, errors:Object}}
   */
  function createJob(existingJobs, input, now) {
    const check = validateReport(input);
    if (!check.valid) {
      return { ok: false, errors: check.errors };
    }

    const at = stamp(now);
    const job = {
      id: nextId(existingJobs),
      house: HOUSE_NAME,
      description: check.values.description,
      reporter: check.values.reporter,
      priority: check.values.priority,
      status: STATUS.NEW,
      createdAt: at,
      completedAt: null,
      completionNote: null,
      history: [{ type: 'created', at: at, status: STATUS.NEW }]
    };
    return { ok: true, job: job };
  }

  /**
   * Move a New job to In Progress.
   * @returns {{ok:true, job:Object} | {ok:false, error:string}}
   */
  function startWork(job, now) {
    if (job.status !== STATUS.NEW) {
      return {
        ok: false,
        kind: 'state',
        error: 'Only a New job can be moved to In Progress. This job is ' + job.status + '.'
      };
    }

    const at = stamp(now);
    const history = copyHistory(job);
    history.push({ type: 'status', at: at, from: job.status, to: STATUS.IN_PROGRESS });

    return {
      ok: true,
      job: Object.assign({}, job, { status: STATUS.IN_PROGRESS, history: history })
    };
  }

  /**
   * Save a progress note on an In Progress job. Earlier history is kept;
   * the new note is added to the end.
   * @returns {{ok:true, job:Object} | {ok:false, kind:string, error:string}}
   *   kind 'validation' = the note itself is unacceptable (show it by the field)
   *   kind 'state'      = the job is in the wrong status for this action
   */
  function addProgressNote(job, noteText, now) {
    if (job.status !== STATUS.IN_PROGRESS) {
      return {
        ok: false,
        kind: 'state',
        error: 'Move the job to In Progress before saving a progress note.'
      };
    }

    const check = validateNote(noteText, 'progress');
    if (!check.valid) {
      return { ok: false, kind: 'validation', error: check.error };
    }

    const history = copyHistory(job);
    history.push({ type: 'note', at: stamp(now), note: check.value });

    return { ok: true, job: Object.assign({}, job, { history: history }) };
  }

  /**
   * Complete a job. A non-blank completion note is REQUIRED. When the
   * note is blank this returns an error and the job is left untouched.
   * @returns {{ok:true, job:Object} | {ok:false, kind:string, error:string}}
   */
  function completeJob(job, noteText, now) {
    if (job.status === STATUS.COMPLETED) {
      return { ok: false, kind: 'state', error: 'This job is already Completed.' };
    }

    const check = validateNote(noteText, 'completion');
    if (!check.valid) {
      return { ok: false, kind: 'validation', error: check.error };
    }

    const at = stamp(now);
    const history = copyHistory(job);
    history.push({ type: 'completed', at: at, from: job.status, to: STATUS.COMPLETED, note: check.value });

    return {
      ok: true,
      job: Object.assign({}, job, {
        status: STATUS.COMPLETED,
        completedAt: at,
        completionNote: check.value,
        history: history
      })
    };
  }

  /** The most recent progress note entry (or null if none has been saved). */
  function getLatestProgressNote(job) {
    for (let i = job.history.length - 1; i >= 0; i--) {
      if (job.history[i].type === 'note') {
        return job.history[i];
      }
    }
    return null;
  }

  MH.jobs = {
    createJob: createJob,
    startWork: startWork,
    addProgressNote: addProgressNote,
    completeJob: completeJob,
    getLatestProgressNote: getLatestProgressNote
  };
})(window);
