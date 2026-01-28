/**
 * Popup entry point
 * Uses shared UIController for logic
 */
/* global PopupController */

document.addEventListener('DOMContentLoaded', () => {
  const popup = new PopupController();
  popup.init();
});
