import { initializeSchoolMap } from './school-map.js';
import { initializeSchoolList } from './school-list.js';
import { initializeCountDisplay } from './school-count.js';
import { initializeAddressEntry } from './address-entry.js';
import { setupFilterEvents } from './school-filters.js';


const [schoolsReq, catchmentsReq] = await Promise.all([
  fetch('data/schools.json'),
  fetch('data/catchments.json'),
]);
const schools = await schoolsReq.json();
const catchments = await catchmentsReq.json();

const eventBus = new EventTarget();

const schoolMap = initializeSchoolMap(schools, eventBus);
const schoolList = initializeSchoolList(schools, eventBus);
const schoolCountDisplay = initializeCountDisplay(schools, eventBus);
const addressEntry = initializeAddressEntry(catchments, eventBus);
setupFilterEvents(schools, eventBus);

// Make these variables globally available.
window.schools = schools;
window.catchments = catchments;
window.schoolMap = schoolMap;
window.schoolList = schoolList;
window.addressEntry = addressEntry;
window.schoolCountDisplay = schoolCountDisplay;
