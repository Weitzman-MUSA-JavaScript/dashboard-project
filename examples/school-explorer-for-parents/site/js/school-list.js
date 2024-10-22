import { htmlToElement } from './template-tools.js';

function initializeSchoolList(schools, eventBus) {
  const list = document.getElementById('school-list');
  list.highlightedIDs = new Set();
  list.items = {};
  list.eventBus = eventBus;

  showSchoolsInList(schools, list);
  setupListEventHandlers(list);

  return list;
}

function setupListEventHandlers(list) {
  list.eventBus.addEventListener('selectionchanged', (evt) => {
    const { added, removed } = evt.detail;
    highlightSchoolsInList(added, list);
    unhighlightSchoolsInList(removed, list);
  });

  list.eventBus.addEventListener('filterschanged', (evt) => {
    const { include } = evt.detail;
    showSchoolsInList(include, list);
  });
}

function isHighlightedInList(school, list) {
  const id = school['sdp_id'];
  return list.highlightedIDs.has(id);
}

function makeSchoolListItem(school, list) {
  const isHighlighted = isHighlightedInList(school, list);
  const html = `
    <li class="school-item ${isHighlighted ? 'highlighted' : ''}" data-sdp-id="${school['sdp_id']}">
      <span class="school-name">${school.name}</span>
      <span class="school-grades-served">${school['Current Grade Span Served']}</span>
      <span class="school-admission-type">${school['Admission Type']}</span>
    </li>
  `;
  const li = htmlToElement(html);
  li.addEventListener('click', () => {
    const detail = isHighlightedInList(school, list)
      ? { 'added': [], 'removed': [school] }
      : { 'added': [school], 'removed': [] };
    const evt = new CustomEvent('selectionchanged', { detail });
    list.eventBus.dispatchEvent(evt);
  });
  return li;
}

function redrawSchoolsInList(schools, list) {
  for (const school of schools) {
    const id = school['sdp_id'];
    const li = list.querySelector(`li[data-sdp-id="${id}"]`);
    if (li) {
      li.replaceWith(makeSchoolListItem(school, list));
    }
  }
}

function highlightSchoolsInList(schools, list) {
  for (const school of schools) {
    const id = school['sdp_id'];
    list.highlightedIDs.add(id);
  }
  redrawSchoolsInList(schools, list);
}

function unhighlightSchoolsInList(schools, list) {
  for (const school of schools) {
    const id = school['sdp_id'];
    list.highlightedIDs.delete(id);
  }
  redrawSchoolsInList(schools, list);
}

function showSchoolsInList(schools, list) {
  list.innerHTML = '';
  for (const school of schools) {
    const li = makeSchoolListItem(school, list);
    list.append(li);
  }
}

export {
  highlightSchoolsInList,
  initializeSchoolList,
  showSchoolsInList,
  unhighlightSchoolsInList,
};
