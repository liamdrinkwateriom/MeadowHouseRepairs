/**
 * format.js
 * ---------------------------------------------------------------
 * Small helpers that turn stored values into text for display.
 */
(function (global) {
  'use strict';

  const MH = global.MeadowHouse;
  const { LOCALE } = MH.config;

  /**
   * Format an ISO date string as e.g. "19 Oct 2026, 10:47".
   * @param {string} iso
   * @param {boolean} [withSeconds]  history entries include seconds so
   *                                 entries made close together stay distinct.
   */
  function formatDateTime(iso, withSeconds) {
    const date = new Date(iso);
    if (isNaN(date.getTime())) {
      return 'Unknown time';
    }
    const options = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    if (withSeconds) {
      options.second = '2-digit';
    }
    return new Intl.DateTimeFormat(LOCALE, options).format(date);
  }

  /** "In Progress" -> "in-progress" (used to build CSS class names). */
  function slug(text) {
    return String(text).toLowerCase().replace(/\s+/g, '-');
  }

  MH.format = { formatDateTime: formatDateTime, slug: slug };
})(window);
