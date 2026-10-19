(function () {
  /* ===== SETTINGS ===== */
  var KEY = 'meadowHouseRepairs.v2';          // localStorage key (change to start fresh)
  var HOUSE = 'Meadow House';
  var STATUSES = ['New', 'In Progress', 'Completed'];

  /* ===== DATA: load/save jobs in the browser ===== */
  var jobs = [];
  try { var saved = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(saved)) jobs = saved; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(jobs)); } catch (e) {} }

  function nextId() {
    var n = 0;
    jobs.forEach(function (j) { n = Math.max(n, parseInt(j.id.split('-')[1], 10) || 0); });
    return 'MH-' + String(n + 1).padStart(4, '0');
  }
  function fmt(iso) {
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  function find(id) { return jobs.filter(function (j) { return j.id === id; })[0]; }
  function latestNote(j) {
    for (var i = j.history.length - 1; i >= 0; i--) if (j.history[i].note) return j.history[i];
    return null;
  }
  function noteLabel(h) { return h.status === 'Completed' ? 'Completion note' : 'Progress note'; }

  /* ===== DOM helper: h('div', {class:'x', text:'plain text'}, child, ...)
     Always uses textContent, so typed text is never treated as HTML. ===== */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    for (var k in (attrs || {})) { if (k === 'text') el.textContent = attrs[k]; else el.setAttribute(k, attrs[k]); }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }

  /* ===== PIECES SHARED BY LIST AND DETAIL ===== */
  function badges(j) {
    return [
      h('span', { 'class': 'badge' + (j.status === 'Completed' ? ' done' : j.status === 'In Progress' ? ' progress' : ''), text: 'Status: ' + j.status }),
      h('span', { 'class': 'badge' + (j.priority === 'Urgent' ? ' urgent' : ''), text: j.priority + ' priority' })
    ];
  }
  function facts(j) {
    return h('dl', {},
      h('dt', { text: 'House' }), h('dd', { text: j.house }),
      h('dt', { text: 'Reported' }), h('dd', { text: fmt(j.created) }),
      h('dt', { text: 'Reporter' }), h('dd', { text: j.reporter }),
      h('dt', { text: 'Description' }), h('dd', { text: j.description }));
  }
  function noteBox(j) {
    var n = latestNote(j);
    if (!n) return null;
    var label = n.status === 'Completed' ? 'Completion note: ' : 'Latest note: ';
    return h('div', { 'class': 'note' }, h('strong', { text: label }), n.note);
  }

  /* ===== VIEW 1: list of all jobs ===== */
  var view = document.getElementById('view');
  var jobFilter = document.getElementById('job-filter');
  jobFilter.addEventListener('change', function () { showList(); });

  view.addEventListener('pointerover', function (ev) {
    if (ev.pointerType !== 'mouse') return;
    var card = ev.target.closest('.job');
    if (card) card.classList.add('job-hovered');
  });
  view.addEventListener('pointerout', function (ev) {
    if (ev.pointerType !== 'mouse') return;
    var card = ev.target.closest('.job');
    if (card && !card.contains(ev.relatedTarget)) card.classList.remove('job-hovered');
  });

  function showList(focusId) {
    view.textContent = '';
    var visibleJobs = jobs.slice().reverse().filter(function (j) {
      if (j.archived) return false;
      return jobFilter.value === 'all' || j.status === jobFilter.value;
    });
    visibleJobs.sort(function (a, b) {
      var aRank = STATUSES.indexOf(a.status);
      var bRank = STATUSES.indexOf(b.status);
      if (aRank < 0) aRank = STATUSES.length;
      if (bRank < 0) bRank = STATUSES.length;
      return aRank - bRank;
    });
    if (!jobs.length) {
      view.appendChild(h('p', { 'class': 'empty', text: 'No repair jobs yet. Use the form to report the first repair.' }));
      return;
    }
    if (!visibleJobs.length) {
      view.appendChild(h('p', { 'class': 'empty', text: 'No jobs match this filter.' }));
      return;
    }
    var wrap = h('div', { 'class': 'jobs' });
    visibleJobs.forEach(function (j) {
      var open = h('button', { type: 'button', 'class': 'alt', text: 'Open job ' + j.id });
      open.onclick = function () { showJob(j.id); };
      var actions = h('div', { 'class': 'job-actions' }, open);
      if (j.status === 'Completed') {
        var archive = h('button', { type: 'button', 'class': 'alt archive-button', text: 'Remove from list' });
        archive.setAttribute('aria-label', 'Remove completed job ' + j.id + ' from the list');
        archive.onclick = function () {
          j.archived = true;
          save();
          showList();
        };
        actions.appendChild(archive);
      }
      wrap.appendChild(h('article', { 'class': 'job' },
        h('div', { 'class': 'head' }, h('h3', { text: 'Job ' + j.id }), badges(j)[0], badges(j)[1]),
        facts(j), noteBox(j), actions));
    });
    view.appendChild(wrap);
  }

  /* ===== VIEW 2: one opened job with its update form and history ===== */
  function showJob(id, msg) {
    var j = find(id);
    view.textContent = '';
    var back = h('button', { type: 'button', 'class': 'alt', text: 'Back to all jobs' });
    back.onclick = function () { showList(); };
    var card = h('article', { 'class': 'job job-detail', 'aria-labelledby': 'dh' });
    card.appendChild(h('div', { 'class': 'head' }, h('h3', { id: 'dh', text: 'Job ' + j.id }), badges(j)[0], badges(j)[1]));
    card.appendChild(facts(j));
    var note = noteBox(j);
    if (note) card.appendChild(note);
    var notice = h('div', { 'class': 'notice', role: 'status', tabindex: '-1', text: msg || '' });
    card.appendChild(notice);

    if (j.status !== 'Completed') {
      var sel = h('select', { id: 'status' });
      STATUSES.forEach(function (s) { var o = h('option', { text: s }); if (s === j.status) o.selected = true; sel.appendChild(o); });
      var note = h('textarea', { id: 'note', 'aria-describedby': 'note-hint note-err' });
      var err = h('p', { 'class': 'err', id: 'note-err' });
      var save_btn = h('button', { type: 'button', text: 'Save update' });
      save_btn.onclick = function () {
        var st = sel.value, text = note.value.trim(), problem = '';
        if (st === 'Completed' && !text) {
          problem = 'Enter a completion note to mark this job Completed. It cannot be empty or only spaces. The job is still ' + j.status + '.';
        } else if (st === j.status && !text) {
          problem = 'Add a note or choose a different status. There is nothing to save.';
        }
        if (problem) {                      // reject: change nothing, keep what was typed
          err.textContent = problem; note.setAttribute('aria-invalid', 'true'); note.focus(); return;
        }
        var label = st !== j.status ? 'Status: ' + st : 'Status stays ' + st;
        j.status = st;
        j.history.push({ at: new Date().toISOString(), status: st, label: label, note: text });
        save();
        showList();
        created.textContent = 'Job ' + j.id + ' saved. Status is ' + st + '.';
        created.focus();
      };
      card.appendChild(h('h4', { text: 'Update this job' }));
      card.appendChild(h('div', { 'class': 'field' }, h('label', { 'for': 'status', text: 'Status' }), sel));
      card.appendChild(h('div', { 'class': 'field' }, h('label', { 'for': 'note', text: 'Note' }), note,
        h('p', { 'class': 'hint', id: 'note-hint', text: 'Add a progress note. A completion note is required when the status is Completed.' }), err));
      card.appendChild(save_btn);
    }

    card.appendChild(h('h4', { text: 'History' }));
    var ol = h('ol', { 'class': 'hist' });
    j.history.forEach(function (e) {
      var li = h('li', {}, h('time', { datetime: e.at, text: fmt(e.at) }), ' ', h('strong', { text: e.label }));
      if (e.note) li.appendChild(document.createTextNode(' \u2013 ' + noteLabel(e) + ': ' + e.note));
      ol.appendChild(li);
    });
    card.appendChild(ol);
    view.appendChild(h('p', {}, back));
    view.appendChild(card);
  }

  /* ===== REPORT FORM ===== */
  var desc = document.getElementById('desc'), rep = document.getElementById('reporter'), prio = document.getElementById('prio');
  var descErr = document.getElementById('desc-err'), repErr = document.getElementById('rep-err'), created = document.getElementById('create-msg');

  document.getElementById('report').addEventListener('submit', function (ev) {
    ev.preventDefault();
    created.textContent = ''; descErr.textContent = ''; repErr.textContent = '';
    desc.removeAttribute('aria-invalid'); rep.removeAttribute('aria-invalid');
    var d = desc.value.trim(), r = rep.value.trim(), first = null;
    if (!d) { descErr.textContent = 'Enter a description of the repair. It cannot be empty or only spaces.'; desc.setAttribute('aria-invalid', 'true'); first = desc; }
    if (!r) { repErr.textContent = 'Enter the reporter name. It cannot be empty or only spaces.'; rep.setAttribute('aria-invalid', 'true'); first = first || rep; }
    if (first) { first.focus(); return; }      // reject: no job created, input kept

    var now = new Date().toISOString();
    var j = { id: nextId(), house: HOUSE, description: d, reporter: r, priority: prio.value, status: 'New', created: now,
              history: [{ at: now, status: 'New', label: 'Job created as New', note: '' }] };
    jobs.push(j); save();
    desc.value = ''; rep.value = ''; prio.value = 'Normal';
    showList();
    created.textContent = 'Job ' + j.id + ' saved as New with ' + j.priority + ' priority.';
    created.focus();
  });

  showList();
})();
