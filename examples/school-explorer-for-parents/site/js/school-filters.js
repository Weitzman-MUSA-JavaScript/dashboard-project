/* globals turf */

const gradeCheckboxes = document.querySelectorAll('[name="school-filter-grade"]');
const admissionCheckboxes = document.querySelectorAll('[name="school-filter-admission"]');
const nameSubstringInput = document.querySelector('[name="school-filter-name"]');

window.schoolNameFilter = nameSubstringInput;
window.schoolGradeFilters = gradeCheckboxes;

let currentCatchment = null;

function shouldShowSchool(school) {
  const filterGrades = Array.from(gradeCheckboxes)
    .filter((c) => c.checked)
    .map((c) => `Grade ${c.value}`);
  for (const g of filterGrades) {
    if (school[g] === '0') {
      return false;
    }
  }

  const filterAdmissions = Array.from(admissionCheckboxes)
    .filter((c) => c.checked)
    .map((c) => c.value);
  if (filterAdmissions.length > 0 && !filterAdmissions.includes(school['Admission Type'])) {
    return false;
  }

  const lSchoolName = school.name.toLowerCase();
  const lFilterNameSubstring = nameSubstringInput.value.toLowerCase();
  if (!lSchoolName.includes(lFilterNameSubstring)) {
    return false;
  }

  if (school['Admission Type'] === 'Neighborhood' && currentCatchment &&
      !turf.booleanPointInPolygon(school.geom.coordinates, currentCatchment)) {
    return false;
  }

  return true;
}

function updateShownSchools(allSchools, eventBus) {
  const schoolsToShow = allSchools.filter(shouldShowSchool);
  const detail = { 'include': schoolsToShow };
  const evt = new CustomEvent('filterschanged', { detail });
  eventBus.dispatchEvent(evt);
}

function setupFilterEvents(allSchools, eventBus) {
  for (const filter of document.querySelectorAll('#school-filters input')) {
    filter.addEventListener('change', () => {
      updateShownSchools(allSchools, eventBus);
    });
    filter.addEventListener('input', () => {
      updateShownSchools(allSchools, eventBus);
    });
  }

  eventBus.addEventListener('addresschanged', (evt) => {
    const { catchment } = evt.detail;
    currentCatchment = catchment;
    updateShownSchools(allSchools, eventBus);
  });
}

export {
  shouldShowSchool,
  setupFilterEvents,
  updateShownSchools,
};
