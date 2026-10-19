/* Meadow House Repairs
 * Plain JavaScript, no framework. Data is kept in browser localStorage.
 * All user-typed text is added to the page with textContent / text nodes,
 * never innerHTML, so HTML-looking text is shown literally.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'meadowHouseRepairs.v1';
  const HOUSE_NAME = 'Meadow House';
  const PRIORITIES = ['Normal', 'Urgent'];
  const STATUSES = ['New', 'In Progress', 'Completed'];

  const dateFmt = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  // ---------- State and storage ----------

  let storageOk = true;
  let state = loadState();
  const drafts = new Map();    // job id -> { progress, completion } unsent text
  const feedback = new Map();  // job id -> { kind, text } last result shown on the card

  function emptyState() {
    return { version: 1, nextNumber: 1, jobs: [] };
  }

  function cleanJob(j) {
    if (!j || typeof j !== 'object') return null;
    if (typeof j.id !== 'string' || typeof j.description !== 'string' ||
        typeof j.reporter !== 'string' || typeof j.createdAt !== 'string') return null;
    if (!PRIORITIES.includes(j.priority) || !STATUSES.includes(j.status)) return null;
    const history = Array.isArray(j.history)
      ? j.history
          .filter((e) => e && typeof e.at === 'string' && typeof e.type === 'string')
          .map((e) => ({
            type: e.type,
            status: typeof e.status === 'string' ? e.status : '',
            text: typeof e.text === 'string' ? e.text : '',
            at: e.at
          }))
      : [];
    return {
      id: j.id,
      house: HOUSE_NAME,
      description: j.description,
      reporter: j.reporter,
      priority: j.priority,
      status: j.status,
      createdAt: j.createdAt,
      completionNote: typeof j.completionNote === 'string' ? j.completionNote : '',
      completedAt: typeof j.completedAt === 'string' ? j.completedAt : '',
      history
    };
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.jobs)) return emptyState();
      const jobs = parsed.jobs.map(cleanJob).filter(Boolean);
      let next = Number.isInteger(parsed.nextNumber) ? parsed.nextNumber : 1;
      jobs.forEach((j) => {
        const m = /^MH-(\d+)$/.exec(j.id);
        if (m) next = Math.max(next, parseInt(m[1], 10) + 1);
      });
      return { version: 1, nextNumber: next, jobs };
    } catch (e) {
      return emptyState();
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageOk = true;
    } catch (e) {
      storageOk = false;
    }
    storageWarning.hidden = storageOk;
  }

  function allocateId() {
    let n = state.nextNumber;
    let id;
    do {
      id = 'MH-' + String(n).padStart(4, '0');
      n += 1;
    } while (state.jobs.some((j) => j.id === id));
    state.nextNumber = n;
    return id;
  }

  function findJob(id) {
    return state.jobs.find((j) => j.id === id);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
  }

  function latestProgressNote(job) {
    for (let i = job.history.length - 1; i >= 0; i--) {
      if (job.history[i].type === 'note') return job.history[i];
    }
    return null;
  }

  // ---------- DOM helpers ----------

  function h(tag, props, ...kids) {
    const node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach((k) => {
        const v = props[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
      });
    }
    kids.flat().forEach((kid) => {
      if (kid !== null && kid !== undefined) node.append(kid); // strings become text nodes
    });
    return node;
  }

  function showError(input, errEl, message) {
    errEl.textContent = 'Error: ' + message;
    errEl.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    const hint = input.dataset.hint;
    input.setAttribute('aria-describedby', (hint ? hint + ' ' : '') + errEl.id);
  }

  function clearError(input, errEl) {
    errEl.textContent = '';
    errEl.hidden = true;
    input.removeAttribute('aria-invalid');
    const hint = input.dataset.hint;
    if (hint) input.setAttribute('aria-describedby', hint);
    else input.removeAttribute('aria-describedby');
  }

  function setDraft(id, key, value) {
    const d = drafts.get(id) || { progress: '', completion: '' };
    d[key] = value;
    drafts.set(id, d);
  }

  // ---------- Page elements ----------

  const form = document.getElementById('report-form');
  const descEl = document.getElementById('description');
  const descErr = document.getElementById('description-error');
  const repEl = document.getElementById('reporter');
  const repErr = document.getElementById('reporter-error');
  const prioEl = document.getElementById('priority');
  const formMessage = document.getElementById('form-message');
  const listEl = document.getElementById('job-list');
  const filterEl = document.getElementById('filter');
  const countEl = document.getElementById('job-count');
  const storageWarning = document.getElementById('storage-warning');

  // ---------- Rendering ----------

  function statusClass(status) {
    return 'status-' + status.toLowerCase().replace(/\s+/g, '-');
  }

  function historyLabel(entry) {
    if (entry.type === 'note') return 'Progress note';
    return entry.status || 'Update';
  }

  function detailRow(label, valueNode) {
    return h('div', null, h('dt', { text: label }), h('dd', null, valueNode));
  }

  function textValue(text) {
    return h('span', { class: 'user-text', text });
  }

  function buildCard(job) {
    const id = job.id;
    const draft = drafts.get(id) || { progress: '', completion: '' };
    const titleId = 'job-title-' + id;

    const card = h('article', {
      class: 'job ' + statusClass(job.status) + (job.priority === 'Urgent' ? ' is-urgent' : '') +
        (job.status === 'Completed' ? ' is-completed' : ''),
      id: 'job-' + id,
      'data-job-id': id,
      'aria-labelledby': titleId,
      tabindex: '-1'
    });

    card.append(
      h('div', { class: 'job-header' },
        h('h3', { id: titleId, text: 'Job ' + id }),
        h('span', { class: 'badge ' + statusClass(job.status), text: job.status }),
        h('span', {
          class: 'badge priority-' + job.priority.toLowerCase(),
          text: job.priority + ' priority'
        })
      )
    );

    const fb = feedback.get(id);
    if (fb) {
      card.append(h('p', {
        class: 'feedback ' + fb.kind,
        id: 'feedback-' + id,
        role: 'status',
        tabindex: '-1',
        text: fb.text
      }));
    }

    const note = latestProgressNote(job);
    const details = h('dl', { class: 'details' },
      detailRow('Description', textValue(job.description)),
      detailRow('Reported by', textValue(job.reporter)),
      detailRow('House', textValue(job.house)),
      detailRow('Reported on', h('time', { datetime: job.createdAt, text: formatDate(job.createdAt) })),
      detailRow('Latest progress note', note
        ? textValue(note.text)
        : h('span', { class: 'user-text', text: 'No progress notes yet.' }))
    );
    if (job.status === 'Completed') {
      details.append(
        detailRow('Completion note', textValue(job.completionNote)),
        detailRow('Completed on', h('time', { datetime: job.completedAt, text: formatDate(job.completedAt) }))
      );
    }
    card.append(details);

    const list = h('ol', { class: 'history' });
    job.history.forEach((entry) => {
      list.append(h('li', { class: 'hist-' + String(entry.type).replace(/[^a-z]/g, '') },
        h('span', { class: 'hist-time' }, h('time', { datetime: entry.at, text: formatDate(entry.at) })),
        h('span', { class: 'hist-label', text: historyLabel(entry) }),
        ' \u2013 ',
        h('span', { class: 'user-text', text: entry.text })
      ));
    });
    card.append(h('h4', { text: 'History' }), list);

    if (job.status === 'Completed') {
      card.append(h('p', { class: 'done-note', text: 'This job is completed. No further updates are needed.' }));
      return card;
    }

    const actions = h('section', { class: 'actions' }, h('h4', { text: 'Update this job' }));

    if (job.status === 'New') {
      actions.append(h('button', {
        type: 'button',
        class: 'btn secondary',
        text: 'Move to In Progress',
        onclick: () => moveToInProgress(id)
      }));
    }

    // Progress note form
    const progId = 'progress-' + id;
    const progErr = h('p', { class: 'field-error', id: progId + '-error', hidden: true });
    const progArea = h('textarea', {
      id: progId, rows: '3', maxlength: '1000', 'data-hint': progId + '-hint',
      'aria-describedby': progId + '-hint'
    });
    progArea.value = draft.progress;
    progArea.addEventListener('input', () => {
      setDraft(id, 'progress', progArea.value);
      clearError(progArea, progErr);
    });
    const progForm = h('form', { class: 'update-form progress-form', novalidate: true },
      h('div', { class: 'field' },
        h('label', { for: progId, text: 'Progress note (required)' }),
        h('p', { class: 'hint', id: progId + '-hint', text: 'What has been done so far?' }),
        progArea,
        progErr
      ),
      h('button', { type: 'submit', class: 'btn secondary', text: 'Save progress note' })
    );
    progForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveProgressNote(id, progArea, progErr);
    });
    actions.append(progForm);

    // Completion form
    const compId = 'completion-' + id;
    const compErr = h('p', { class: 'field-error', id: compId + '-error', hidden: true });
    const compArea = h('textarea', {
      id: compId, rows: '3', maxlength: '1000', 'data-hint': compId + '-hint',
      'aria-describedby': compId + '-hint'
    });
    compArea.value = draft.completion;
    compArea.addEventListener('input', () => {
      setDraft(id, 'completion', compArea.value);
      clearError(compArea, compErr);
    });
    const compForm = h('form', { class: 'update-form complete-form', novalidate: true },
      h('div', { class: 'field' },
        h('label', { for: compId, text: 'Completion note (required)' }),
        h('p', { class: 'hint', id: compId + '-hint', text: 'Explain what was done to finish this repair.' }),
        compArea,
        compErr
      ),
      h('button', { type: 'submit', class: 'btn success', text: 'Mark as Completed' })
    );
    compForm.addEventListener('submit', (e) => {
      e.preventDefault();
      completeJob(id, compArea, compErr);
    });
    actions.append(compForm);

    card.append(actions);
    return card;
  }

  function updateSummary() {
    const counts = { 'New': 0, 'In Progress': 0, 'Completed': 0 };
    let urgentOpen = 0;
    state.jobs.forEach((j) => {
      counts[j.status] += 1;
      if (j.priority === 'Urgent' && j.status !== 'Completed') urgentOpen += 1;
    });
    document.getElementById('sum-new').textContent = counts['New'];
    document.getElementById('sum-progress').textContent = counts['In Progress'];
    document.getElementById('sum-completed').textContent = counts['Completed'];
    document.getElementById('sum-urgent').textContent = urgentOpen;
  }

  function renderCard(job, focusFeedback) {
    const fresh = buildCard(job);
    const old = document.getElementById('job-' + job.id);
    if (old) old.replaceWith(fresh);
    else listEl.prepend(fresh);
    updateSummary();
    if (focusFeedback) {
      const fb = fresh.querySelector('.feedback');
      if (fb) fb.focus();
    }
  }

  function renderList() {
    const filter = filterEl.value;
    const jobs = state.jobs
      .slice()
      .reverse()
      .filter((j) => filter === 'all' || j.status === filter);

    listEl.replaceChildren();
    if (jobs.length === 0) {
      listEl.append(h('p', {
        class: 'empty',
        text: state.jobs.length === 0
          ? 'No repair jobs yet. Use the form to report a repair.'
          : 'No jobs match this filter.'
      }));
    } else {
      jobs.forEach((job) => listEl.append(buildCard(job)));
    }
    const total = state.jobs.length;
    countEl.textContent = filter === 'all'
      ? total + (total === 1 ? ' job saved' : ' jobs saved')
      : 'Showing ' + jobs.length + ' of ' + total + (total === 1 ? ' job' : ' jobs');
    updateSummary();
  }

  // ---------- Actions ----------

  function setFeedback(id, kind, text) {
    feedback.set(id, { kind, text });
  }

  function setFormMessage(kind, text, jobId) {
    formMessage.className = 'message ' + kind;
    formMessage.replaceChildren(text);
    if (jobId) {
      const link = h('a', { href: '#progress', text: 'View job ' + jobId + ' in Check progress' });
      link.addEventListener('click', (e) => {
        e.preventDefault();
        goToJob(jobId);
      });
      formMessage.append(' ', link);
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError(descEl, descErr);
    clearError(repEl, repErr);

    const problems = [];
    if (!descEl.value.trim()) {
      showError(descEl, descErr,
        'Enter a description of the repair. It cannot be empty or contain only spaces.');
      problems.push(descEl);
    }
    if (!repEl.value.trim()) {
      showError(repEl, repErr,
        'Enter the reporter name. It cannot be empty or contain only spaces.');
      problems.push(repEl);
    }
    if (problems.length > 0) {
      setFormMessage('error',
        'No repair was reported. Please fix the ' +
        (problems.length === 1 ? 'problem' : 'problems') +
        ' shown below. Anything valid you typed has been kept.');
      problems[0].focus();
      return;
    }

    state = loadState();
    const now = nowIso();
    const priority = prioEl.value === 'Urgent' ? 'Urgent' : 'Normal';
    const job = {
      id: allocateId(),
      house: HOUSE_NAME,
      description: descEl.value.trim(),
      reporter: repEl.value.trim(),
      priority,
      status: 'New',
      createdAt: now,
      completionNote: '',
      completedAt: '',
      history: [{ type: 'created', status: 'New', text: 'Job created', at: now }]
    };
    state.jobs.push(job);
    saveState();

    form.reset();
    prioEl.value = 'Normal';
    filterEl.value = 'all';
    renderList();
    setFormMessage('success',
      'Repair reported. Job ' + job.id + ' was created as New with ' + priority + ' priority.',
      job.id);
    formMessage.focus();
  });

  descEl.addEventListener('input', () => clearError(descEl, descErr));
  repEl.addEventListener('input', () => clearError(repEl, repErr));
  filterEl.addEventListener('change', renderList);

  function reloadJob(id) {
    state = loadState();
    return findJob(id);
  }

  function moveToInProgress(id) {
    const job = reloadJob(id);
    if (!job) return;
    if (job.status === 'New') {
      job.history.push({
        type: 'status', status: 'In Progress',
        text: 'Status changed from New to In Progress', at: nowIso()
      });
      job.status = 'In Progress';
      saveState();
      setFeedback(id, 'success', 'Saved. Job ' + id + ' is now In Progress.');
    } else {
      setFeedback(id, 'error', 'Job ' + id + ' is already ' + job.status + ', so nothing was changed.');
    }
    renderCard(job, true);
  }

  function saveProgressNote(id, area, errEl) {
    const text = area.value.trim();
    if (!text) {
      showError(area, errEl,
        'Enter a progress note before saving. It cannot be empty or contain only spaces. Nothing was saved.');
      area.focus();
      return;
    }
    const job = reloadJob(id);
    if (!job) return;
    if (job.status === 'Completed') {
      setFeedback(id, 'error', 'Job ' + id + ' is already Completed, so the note was not saved.');
      renderCard(job, true);
      return;
    }
    job.history.push({ type: 'note', status: job.status, text, at: nowIso() });
    saveState();
    setDraft(id, 'progress', '');
    setFeedback(id, 'success', 'Saved. Progress note added to job ' + id + '. Status is ' + job.status + '.');
    renderCard(job, true);
  }

  function completeJob(id, area, errEl) {
    const text = area.value.trim();
    const current = findJob(id);
    if (!text) {
      showError(area, errEl,
        'Enter a completion note before marking this job Completed. It cannot be empty or contain only spaces. ' +
        'The job is still ' + (current ? current.status : 'open') + ' and its notes and history are unchanged.');
      area.focus();
      return;
    }
    const job = reloadJob(id);
    if (!job) return;
    if (job.status === 'Completed') {
      setFeedback(id, 'error', 'Job ' + id + ' is already Completed, so nothing was changed.');
      renderCard(job, true);
      return;
    }
    const now = nowIso();
    job.history.push({ type: 'completed', status: 'Completed', text, at: now });
    job.status = 'Completed';
    job.completionNote = text;
    job.completedAt = now;
    saveState();
    setDraft(id, 'completion', '');
    setDraft(id, 'progress', '');
    setFeedback(id, 'success', 'Saved. Job ' + id + ' is now Completed.');
    renderCard(job, true);
  }

  // ---------- Pages (home / report / progress) ----------

  const VIEWS = ['home', 'report', 'progress'];
  const TITLES = { home: 'Home', report: 'Report a repair', progress: 'Check progress' };
  let pendingJob = null;

  function currentViewName() {
    const n = window.location.hash.replace('#', '');
    return VIEWS.includes(n) ? n : 'home';
  }

  function focusJob(id) {
    const card = document.getElementById('job-' + id);
    if (card) {
      card.scrollIntoView({ block: 'start' });
      card.focus();
    }
  }

  function showView(initial) {
    const name = currentViewName();
    VIEWS.forEach((v) => { document.getElementById('view-' + v).hidden = v !== name; });
    document.querySelectorAll('.nav-link').forEach((a) => {
      if (a.dataset.view === name) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = TITLES[name] + ' \u2013 Meadow House Repairs';
    if (pendingJob) {
      focusJob(pendingJob);
      pendingJob = null;
      return;
    }
    if (!initial) {
      window.scrollTo(0, 0);
      const heading = document.querySelector('#view-' + name + ' h2');
      if (heading) heading.focus();
    }
  }

  function goToJob(id) {
    filterEl.value = 'all';
    renderList();
    pendingJob = id;
    if (currentViewName() === 'progress') showView(false);
    else window.location.hash = '#progress';
  }

  document.querySelector('.skip-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('main').focus();
  });
  window.addEventListener('hashchange', () => showView(false));

  // ---------- Start ----------

  storageWarning.hidden = true;
  renderList();
  showView(true);
})();
