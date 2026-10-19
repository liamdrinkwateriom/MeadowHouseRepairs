/**
 * validation.js
 * ---------------------------------------------------------------
 * Pure functions that decide whether typed input is acceptable and
 * produce the human-friendly error messages shown next to the field.
 *
 * Nothing in here touches the page (DOM) or storage, which keeps the
 * rules easy to read and easy to test.
 */
(function (global) {
  'use strict';

  const MH = global.MeadowHouse;
  const { LIMITS, PRIORITIES } = MH.config;

  /**
   * True when the text is empty or contains only "invisible" characters.
   * Normal whitespace (spaces, tabs, new lines, non-breaking spaces) is
   * covered by \s; the extra range catches zero-width characters that
   * look blank on screen but would slip past a plain trim().
   */
  function isBlank(value) {
    return typeof value !== 'string' || /^[\s​-‍⁠﻿]*$/.test(value);
  }

  /** Trim outer whitespace; always returns a string. */
  function clean(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  /**
   * Validate the "Report a repair" form.
   * @param {{description:string, reporter:string, priority:string}} input
   * @returns {{valid:boolean, errors:Object, values:Object}}
   *   `errors` has one message per invalid field (keyed by field name);
   *   `values` holds the cleaned (trimmed) values ready to save.
   */
  function validateReport(input) {
    const data = input || {};
    const errors = {};

    // --- Description -------------------------------------------------
    if (isBlank(data.description)) {
      errors.description =
        'Enter a description of the repair. It cannot be empty or contain only spaces.';
    } else if (clean(data.description).length > LIMITS.description) {
      errors.description =
        'The description is too long. Please keep it to ' + LIMITS.description + ' characters or fewer.';
    }

    // --- Reporter name -----------------------------------------------
    if (isBlank(data.reporter)) {
      errors.reporter =
        'Enter the reporter’s name. It cannot be empty or contain only spaces.';
    } else if (clean(data.reporter).length > LIMITS.reporter) {
      errors.reporter =
        'The name is too long. Please keep it to ' + LIMITS.reporter + ' characters or fewer.';
    }

    // --- Priority ----------------------------------------------------
    if (PRIORITIES.indexOf(data.priority) === -1) {
      errors.priority = 'Choose a priority: Normal or Urgent.';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors: errors,
      values: {
        description: clean(data.description),
        reporter: clean(data.reporter),
        priority: data.priority
      }
    };
  }

  /**
   * Validate a progress note or a completion note.
   * @param {string} text   what the person typed
   * @param {'progress'|'completion'} kind  decides the wording of the message
   * @returns {{valid:boolean, error:(string|null), value:string}}
   */
  function validateNote(text, kind) {
    if (isBlank(text)) {
      const message =
        kind === 'completion'
          ? 'Enter a completion note to complete this job. It cannot be empty or contain only spaces. The job has not been changed.'
          : 'Enter a progress note before saving. It cannot be empty or contain only spaces.';
      return { valid: false, error: message, value: '' };
    }

    const value = clean(text);
    if (value.length > LIMITS.note) {
      return {
        valid: false,
        error: 'The note is too long. Please keep it to ' + LIMITS.note + ' characters or fewer.',
        value: value
      };
    }
    return { valid: true, error: null, value: value };
  }

  MH.validation = { isBlank: isBlank, validateReport: validateReport, validateNote: validateNote };
})(window);
