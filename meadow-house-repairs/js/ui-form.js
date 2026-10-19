/**
 * ui-form.js
 * ---------------------------------------------------------------
 * Controls the "Report a repair" form:
 *   - reads what was typed
 *   - asks app.js to create the job
 *   - on a problem: shows an error beside each bad field, KEEPS what
 *     the person typed, and moves focus to the first problem
 *   - on success: clears the form and shows a confirmation message
 */
(function (global) {
  'use strict';

  const MH = global.MeadowHouse;
  const { el, showFieldError, clearFieldError } = MH.dom;

  MH.ui = MH.ui || {};

  /**
   * @param {{submitReport: function(Object): Object}} appActions
   *   submitReport receives {description, reporter, priority} and returns
   *   {ok:true, job} or {ok:false, errors}.
   */
  function init(appActions) {
    const form = document.getElementById('report-form');
    const status = document.getElementById('form-status');

    // Each field: the input, its error message element and its hint id.
    // Priority is a radio group, so its "input" for error purposes is the group's first radio.
    const fields = {
      description: {
        input: document.getElementById('description'),
        error: document.getElementById('description-error'),
        hintId: 'description-hint'
      },
      reporter: {
        input: document.getElementById('reporter'),
        error: document.getElementById('reporter-error'),
        hintId: 'reporter-hint'
      },
      priority: {
        input: document.getElementById('priority-normal'),
        error: document.getElementById('priority-error'),
        hintId: 'priority-hint'
      }
    };
    const fieldOrder = ['description', 'reporter', 'priority'];

    /** Which priority radio is ticked ('' if somehow none). */
    function selectedPriority() {
      const checked = form.querySelector('input[name="priority"]:checked');
      return checked ? checked.value : '';
    }

    /** Remove every error message. */
    function clearAllErrors() {
      fieldOrder.forEach(function (name) {
        clearFieldError(fields[name].input, fields[name].error, fields[name].hintId);
      });
    }

    // As soon as the person edits a field, its old error is no longer true.
    ['description', 'reporter'].forEach(function (name) {
      fields[name].input.addEventListener('input', function () {
        clearFieldError(fields[name].input, fields[name].error, fields[name].hintId);
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault(); // stay on the page; we handle everything here
      status.textContent = '';
      status.className = 'form-status';
      clearAllErrors();

      const result = appActions.submitReport({
        description: fields.description.input.value,
        reporter: fields.reporter.input.value,
        priority: selectedPriority()
      });

      // ---------- Problem: explain it, keep the typed values ----------
      if (!result.ok) {
        const badFields = fieldOrder.filter(function (name) {
          return result.errors[name];
        });

        badFields.forEach(function (name) {
          showFieldError(fields[name].input, fields[name].error, result.errors[name], fields[name].hintId);
        });

        status.className = 'form-status form-status--error';
        status.textContent =
          'Repair report not created: ' +
          badFields.length +
          (badFields.length === 1 ? ' field needs' : ' fields need') +
          ' fixing. Your other answers have been kept.';

        fields[badFields[0]].input.focus(); // first problem field
        return;
      }

      // ---------- Success: confirm, then reset the form ----------
      const job = result.job;
      form.reset(); // radio goes back to Normal, text boxes empty

      status.className = 'form-status form-status--success';
      status.appendChild(
        el('p', {
          text:
            'Repair job ' + job.id + ' created for ' + job.house +
            '. Status: ' + job.status + '. Priority: ' + job.priority + '.'
        })
      );
      status.appendChild(
        el('a', { text: 'Go to job ' + job.id, attrs: { href: '#job-' + job.id } })
      );
    });
  }

  MH.ui.form = { init: init };
})(window);
