/**
 * ui-jobs.js
 * ---------------------------------------------------------------
 * Draws the list of repair job cards and handles the buttons and
 * forms inside each card (Move to In Progress, Save progress note,
 * Mark as Completed).
 *
 * How updates work:
 *   - Only the card that changed is rebuilt. Other cards are left
 *     alone, so text someone is typing into another card is not lost.
 *   - After a successful update, focus moves to a confirmation message
 *     at the top of that card ("Progress note saved ..."). This both
 *     shows the result and announces it to screen readers.
 *   - After a failed update (for example a blank completion note) the
 *     card is NOT rebuilt: the error appears next to the field, the
 *     typed text stays, and nothing saved is changed.
 *
 * All typed text is inserted with textContent (via el()), so it is
 * always shown as plain text and never read as HTML.
 */
(function (global) {
  'use strict';

  const MH = global.MeadowHouse;
  const { STATUS, LIMITS } = MH.config;
  const { el, showFieldError, clearFieldError } = MH.dom;
  const { formatDateTime, slug } = MH.format;
  const { getLatestProgressNote } = MH.jobs;

  MH.ui = MH.ui || {};

  // Supplied by app.js in init():
  let actions = null;   // { getJobs, getJob, startWork, addProgressNote, completeJob }
  let listEl = null;    // #job-list
  let countEl = null;   // #job-count
  let emptyEl = null;   // #empty-message

  // ------------------------------------------------------------------
  // Small building blocks
  // ------------------------------------------------------------------

  /** <time> element showing a formatted date/time. */
  function timeEl(iso, withSeconds) {
    return el('time', { text: formatDateTime(iso, withSeconds), attrs: { datetime: iso } });
  }

  /** A label + value pair inside the job details list. */
  function detail(label, valueNode, extraClass) {
    return el('div', { className: 'detail' + (extraClass ? ' ' + extraClass : '') }, [
      el('dt', { text: label }),
      el('dd', {}, [valueNode])
    ]);
  }

  /**
   * A text block with a heading, used for "Latest progress note" and
   * "Completion note". The paragraph uses the "plain" class so line
   * breaks are kept and long words wrap instead of overflowing.
   */
  function noteBlock(jobId, key, title, text, whenLabel, iso, extraClass) {
    const headingId = 'job-' + jobId + '-' + key + '-title';
    return el('section', { className: 'note-block ' + (extraClass || ''), attrs: { 'aria-labelledby': headingId } }, [
      el('h4', { id: headingId, text: title }),
      el('p', { className: 'plain', text: text }),
      el('p', { className: 'meta' }, [whenLabel + ' ', timeEl(iso, true)])
    ]);
  }

  // ------------------------------------------------------------------
  // History
  // ------------------------------------------------------------------

  /** Turn a stored history entry into readable words. */
  function describeEntry(entry) {
    switch (entry.type) {
      case 'created':
        return { title: 'Job created', summary: 'Status set to ' + entry.status + '.', note: null };
      case 'status':
        return { title: 'Status changed', summary: 'From ' + entry.from + ' to ' + entry.to + '.', note: null };
      case 'note':
        return { title: 'Progress note saved', summary: null, note: entry.note };
      case 'completed':
        return {
          title: 'Job completed',
          summary: 'Status changed from ' + entry.from + ' to ' + entry.to + '.',
          note: entry.note,
          noteLabel: 'Completion note: '
        };
      default:
        return { title: 'Update', summary: null, note: null };
    }
  }

  /** The history list, newest entry first. Earlier entries are always kept. */
  function buildHistory(job) {
    const items = job.history
      .slice()
      .reverse()
      .map(function (entry) {
        const info = describeEntry(entry);
        return el('li', { className: 'history__item' }, [
          el('p', { className: 'history__when' }, [timeEl(entry.at, true)]),
          el('p', { className: 'history__title', text: info.title }),
          info.summary ? el('p', { className: 'history__summary', text: info.summary }) : null,
          info.note
            ? el('p', { className: 'history__note plain' }, [
                info.noteLabel ? el('strong', { text: info.noteLabel }) : null,
                info.note // plain text node
              ])
            : null
        ]);
      });

    return el('details', { className: 'history', attrs: { open: true } }, [
      el('summary', {
        text: 'History (' + job.history.length + (job.history.length === 1 ? ' entry' : ' entries') + ', newest first)'
      }),
      el('ol', { className: 'history__list' }, items)
    ]);
  }

  // ------------------------------------------------------------------
  // Forms inside a card
  // ------------------------------------------------------------------

  /**
   * A one-textarea form (used for both progress and completion notes).
   * @param {Object} job
   * @param {Object} cfg  { key, label, hint, buttonText, buttonClass, onSubmit(text, ui) }
   *   `ui` gives onSubmit access to { textarea, errorEl } so it can show errors.
   */
  function buildNoteForm(job, cfg) {
    const base = 'job-' + job.id + '-' + cfg.key;
    const hintId = base + '-hint';

    const textarea = el('textarea', {
      id: base + '-note',
      attrs: {
        rows: 3,
        maxlength: LIMITS.note,
        required: true,
        'aria-required': 'true',
        'aria-describedby': hintId
      }
    });
    const errorEl = el('p', { id: base + '-error', className: 'error', attrs: { hidden: true } });

    const form = el('form', { className: 'job-form', attrs: { novalidate: true } }, [
      el('label', { text: cfg.label, attrs: { for: textarea.id } }),
      el('p', { id: hintId, className: 'hint', text: cfg.hint }),
      textarea,
      errorEl,
      el('button', { className: 'btn ' + cfg.buttonClass, text: cfg.buttonText, attrs: { type: 'submit' } })
    ]);

    // Editing the text removes the old error message.
    textarea.addEventListener('input', function () {
      clearFieldError(textarea, errorEl, hintId);
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearFieldError(textarea, errorEl, hintId);
      cfg.onSubmit(textarea.value, {
        // Called by the handler when the note was rejected:
        // show the message, keep the typed text, put focus back in the field.
        showError: function (message) {
          showFieldError(textarea, errorEl, message, hintId);
          textarea.focus();
        }
      });
    });

    return form;
  }

  /** The "Update this job" area. Completed jobs get a short note instead. */
  function buildActions(job) {
    const headingId = 'job-' + job.id + '-actions-title';

    if (job.status === STATUS.COMPLETED) {
      return el('section', { className: 'actions', attrs: { 'aria-labelledby': headingId } }, [
        el('h4', { id: headingId, text: 'Update this job' }),
        el('p', { className: 'hint', text: 'This job is Completed, so no further updates can be made.' })
      ]);
    }

    const parts = [el('h4', { id: headingId, text: 'Update this job' })];

    // Step 1 (New jobs only): move to In Progress.
    if (job.status === STATUS.NEW) {
      parts.push(
        el('div', { className: 'action-group' }, [
          el('p', { className: 'hint', text: 'Start work first, then you can save progress notes.' }),
          el('button', {
            className: 'btn btn--secondary',
            text: 'Move to In Progress',
            attrs: { type: 'button' },
            on: { click: function () { handleStartWork(job.id); } }
          })
        ])
      );
    }

    // Step 2 (In Progress jobs only): save a progress note.
    if (job.status === STATUS.IN_PROGRESS) {
      parts.push(
        buildNoteForm(job, {
          key: 'progress',
          label: 'Progress note',
          hint: 'Say what has been done so far. Up to ' + LIMITS.note + ' characters.',
          buttonText: 'Save progress note',
          buttonClass: 'btn--secondary',
          onSubmit: function (text, ui) { handleProgressNote(job.id, text, ui); }
        })
      );
    }

    // Completing a job (New or In Progress): a completion note is required.
    parts.push(
      buildNoteForm(job, {
        key: 'completion',
        label: 'Completion note',
        hint: 'Required. Describe what was done to finish the repair.',
        buttonText: 'Mark as Completed',
        buttonClass: 'btn--primary',
        onSubmit: function (text, ui) { handleComplete(job.id, text, ui); }
      })
    );

    return el('section', { className: 'actions', attrs: { 'aria-labelledby': headingId } }, parts);
  }

  // ------------------------------------------------------------------
  // The job card
  // ------------------------------------------------------------------

  /**
   * Build one card.
   * @param {Object} job
   * @param {{kind:'success'|'error', message:string}} [feedback]
   *   optional confirmation/error message shown at the top of the card.
   */
  function buildCard(job, feedback) {
    const titleId = 'job-' + job.id + '-title';
    const latestNote = getLatestProgressNote(job);

    const card = el(
      'article',
      {
        id: 'job-' + job.id,
        className: 'job job--' + slug(job.status) + (job.priority === 'Urgent' ? ' job--urgent' : ''),
        attrs: { 'aria-labelledby': titleId, tabindex: '-1' }
      },
      [
        // Header: ID plus status and priority badges (both stated in words).
        el('header', { className: 'job__header' }, [
          el('h3', { id: titleId, className: 'job__title', text: 'Job ' + job.id }),
          el('div', { className: 'badges' }, [
            el('span', { className: 'badge badge--status-' + slug(job.status), text: 'Status: ' + job.status }),
            el('span', {
              className: 'badge ' + (job.priority === 'Urgent' ? 'badge--urgent' : 'badge--normal'),
              text: 'Priority: ' + job.priority
            })
          ])
        ]),

        // Feedback message (only present straight after an update).
        feedback
          ? el('p', {
              id: 'job-' + job.id + '-feedback',
              className: 'feedback feedback--' + feedback.kind,
              text: feedback.message,
              attrs: { role: feedback.kind === 'error' ? 'alert' : 'status', tabindex: '-1' }
            })
          : null,

        // Core fields.
        el('dl', { className: 'job__details' }, [
          detail('Description', el('span', { className: 'plain', text: job.description }), 'detail--wide'),
          detail('Reported by', el('span', { className: 'plain', text: job.reporter })),
          detail('Reported on', job.createdAt ? timeEl(job.createdAt, false) : document.createTextNode('Unknown')),
          detail('House', document.createTextNode(job.house))
        ]),

        // Latest progress note (if any has been saved).
        latestNote ? noteBlock(job.id, 'latest', 'Latest progress note', latestNote.note, 'Saved', latestNote.at) : null,

        // Completion note (only for completed jobs).
        job.status === STATUS.COMPLETED && job.completionNote
          ? noteBlock(job.id, 'done', 'Completion note', job.completionNote, 'Completed', job.completedAt, 'note-block--done')
          : null,

        buildActions(job),
        buildHistory(job)
      ]
    );

    return card;
  }

  // ------------------------------------------------------------------
  // Rendering the list
  // ------------------------------------------------------------------

  /** Update the "3 jobs" text and show/hide the empty-state message. */
  function refreshSummary() {
    const total = actions.getJobs().length;
    countEl.textContent = total + (total === 1 ? ' job' : ' jobs');
    emptyEl.hidden = total !== 0;
  }

  /** Draw every job (newest first). Used once when the page loads. */
  function renderAll() {
    listEl.textContent = '';
    actions
      .getJobs()
      .slice()
      .reverse()
      .forEach(function (job) {
        listEl.appendChild(buildCard(job));
      });
    refreshSummary();
  }

  /** Put a newly created job at the top of the list. */
  function addCard(job) {
    listEl.insertBefore(buildCard(job), listEl.firstChild);
    refreshSummary();
  }

  /** Replace ONE card after a change, then move focus to the result message. */
  function updateCard(job, feedback) {
    const existing = document.getElementById('job-' + job.id);
    const fresh = buildCard(job, feedback);
    if (existing) {
      existing.replaceWith(fresh);
    } else {
      listEl.insertBefore(fresh, listEl.firstChild);
    }
    const message = fresh.querySelector('.feedback');
    if (message) {
      message.focus();
    }
  }

  // ------------------------------------------------------------------
  // Handlers for the buttons and forms
  // ------------------------------------------------------------------

  /** Show a problem that is not tied to a field (e.g. the job changed in another tab). */
  function showCardProblem(id, message) {
    const job = actions.getJob(id);
    if (job) {
      updateCard(job, { kind: 'error', message: message });
    }
  }

  function handleStartWork(id) {
    const result = actions.startWork(id);
    if (!result.ok) {
      showCardProblem(id, result.error);
      return;
    }
    updateCard(result.job, {
      kind: 'success',
      message: 'Saved. Job ' + id + ' is now In Progress. You can add progress notes below.'
    });
  }

  function handleProgressNote(id, text, ui) {
    const result = actions.addProgressNote(id, text);
    if (!result.ok) {
      if (result.kind === 'validation') {
        ui.showError(result.error); // keeps typed text, nothing saved is changed
      } else {
        showCardProblem(id, result.error);
      }
      return;
    }
    updateCard(result.job, {
      kind: 'success',
      message: 'Saved. Your progress note is now the latest note, and a new entry has been added to the history.'
    });
  }

  function handleComplete(id, text, ui) {
    const result = actions.completeJob(id, text);
    if (!result.ok) {
      if (result.kind === 'validation') {
        ui.showError(result.error); // job keeps its status, notes and history
      } else {
        showCardProblem(id, result.error);
      }
      return;
    }
    updateCard(result.job, {
      kind: 'success',
      message: 'Saved. Job ' + id + ' is now Completed. Your completion note is shown below.'
    });
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  function init(appActions) {
    actions = appActions;
    listEl = document.getElementById('job-list');
    countEl = document.getElementById('job-count');
    emptyEl = document.getElementById('empty-message');
  }

  MH.ui.jobs = { init: init, renderAll: renderAll, addCard: addCard };
})(window);
