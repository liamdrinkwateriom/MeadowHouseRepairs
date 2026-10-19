/**
 * dom.js
 * ---------------------------------------------------------------
 * Helpers for building page elements and showing field errors.
 *
 * SECURITY / PLAIN-TEXT RULE
 * Typed text (descriptions, names, notes) must be shown exactly as
 * typed, even if it looks like HTML such as <b>check gate</b>.
 * That is why `el()` only ever uses `textContent` for text and the app
 * never uses innerHTML anywhere. The browser then treats the characters
 * as plain text and never interprets or runs them.
 */
(function (global) {
  'use strict';

  const MH = global.MeadowHouse;

  /**
   * Create an element.
   * @param {string} tag
   * @param {Object} [props]
   *   className, id, text (plain text), attrs ({name: value}), on ({event: handler})
   *   For attrs: true sets a bare attribute (e.g. hidden), false/null/undefined skips it.
   * @param {Array<Node|string|null>} [children]  null entries are ignored.
   */
  function el(tag, props, children) {
    const node = document.createElement(tag);
    const p = props || {};

    if (p.className) node.className = p.className;
    if (p.id) node.id = p.id;
    if (p.text !== undefined && p.text !== null) node.textContent = p.text; // plain text only

    if (p.attrs) {
      Object.keys(p.attrs).forEach(function (name) {
        const value = p.attrs[name];
        if (value === true) {
          node.setAttribute(name, '');
        } else if (value !== false && value !== null && value !== undefined) {
          node.setAttribute(name, String(value));
        }
      });
    }

    if (p.on) {
      Object.keys(p.on).forEach(function (eventName) {
        node.addEventListener(eventName, p.on[eventName]);
      });
    }

    (children || []).forEach(function (child) {
      if (child === null || child === undefined) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });

    return node;
  }

  /**
   * Show an error for one input.
   *  - The message appears in `errorEl` (visible, starts with "Error:").
   *  - The input is marked aria-invalid and linked to the message with
   *    aria-describedby, so screen readers read the error with the field.
   * @param {HTMLElement} input
   * @param {HTMLElement} errorEl   an element with a unique id
   * @param {string} message
   * @param {string} [hintId]       id of the hint text, kept in the description
   */
  function showFieldError(input, errorEl, message, hintId) {
    errorEl.textContent = 'Error: ' + message;
    errorEl.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', (hintId ? hintId + ' ' : '') + errorEl.id);
  }

  /** Remove an error and restore the input's normal description. */
  function clearFieldError(input, errorEl, hintId) {
    errorEl.textContent = '';
    errorEl.hidden = true;
    input.removeAttribute('aria-invalid');
    if (hintId) {
      input.setAttribute('aria-describedby', hintId);
    } else {
      input.removeAttribute('aria-describedby');
    }
  }

  MH.dom = { el: el, showFieldError: showFieldError, clearFieldError: clearFieldError };
})(window);
