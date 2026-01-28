/**
 * Options entry point
 * Uses shared UIController for logic
 */
/* global OptionsController */

document.addEventListener('DOMContentLoaded', () => {
  const options = new OptionsController();
  options.init();
});
