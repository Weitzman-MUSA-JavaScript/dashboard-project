function initializeCountDisplay(schools, eventBus) {
  const schoolCountDisplay = document.querySelector('#school-count');

  updateCountDisplay(schools, schoolCountDisplay);
  setupCountDisplayEventHandlers(schoolCountDisplay, eventBus);

  return schoolCountDisplay;
}

function setupCountDisplayEventHandlers(display, eventBus) {
  eventBus.addEventListener('filterschanged', (evt) => {
    const { include } = evt.detail;
    updateCountDisplay(include, display);
  });
}

function updateCountDisplay(schools, display) {
  display.innerHTML = `Showing ${schools.length} school${schools.length === 1 ? '' : 's'}`;
}

export {
  initializeCountDisplay,
};
