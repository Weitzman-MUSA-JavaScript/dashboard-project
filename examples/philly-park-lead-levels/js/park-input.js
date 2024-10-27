const parkEntry = document.querySelector('#entry');
const parkChoiceList = document.querySelector(`#park-choices`);

// if checkbox is checked, see input
function initializeParkEntry(parks, events) {
  if (parkEntry.mycustomfunc) { // first need to remove all exsting event listener on the search box to avoid duplicates
    parkEntry.removeEventListener('input', parkEntry.mycustomfunc);
  }
  parkEntry.mycustomfunc = (evt) => {
    handleSearchboxInput(parks, events); // define customized attribute
  };
  parkEntry.addEventListener('input', parkEntry.mycustomfunc); // need to have a customized attribute to remove this event listener later
}

function handleSearchboxInput(parks, events) {
  parkChoiceList.classList.remove('hidden'); // First remove the hidden style of ol
  console.log('handling park inputs');
  const lowerCaseValue = parkEntry.value.toLowerCase();

  let html = '';
  for (const feature of parks.features) {
    if (lowerCaseValue != ``) {
      if (feature.properties.ASSET_NAME.toLowerCase().includes(lowerCaseValue) || feature.properties.SITE_NAME.toLowerCase().includes(lowerCaseValue)) {// make it case insensitive
        const lihtml = `
        <li data-parkid="${feature.id}"> 
          ${feature.properties.ASSET_NAME} - ${feature.properties.SITE_NAME}
        </li>
        `; // remember to add customized data attribute to have reference of the park ID for later use
        html += lihtml;
      }
    } if (lowerCaseValue == ``) { // remove the ol style when there is no input
      parkChoiceList.classList.add('hidden'); // add a hidden label to "remove", style hidden in CSS
    }
  }
  parkChoiceList.innerHTML = html;

  const choices = parkChoiceList.querySelectorAll('li'); // select all the children of address choice list that match li
  for (const choice of choices) {
    choice.addEventListener('click', (evt) => {
      handleParkChoice(evt, events);
    });
  }
}

function handleParkChoice(evt, events) {
  const li = evt.target; // .target is just get the object you click
  console.log(li);
  const mapZoomSelect = li.dataset.parkid; // .dataset is get the attribute in html (get your customized attribute!)

  // put the click content to the input box, same as address part
  const text = li.innerText;
  parkEntry.value = text;
  parkChoiceList.classList.add('hidden');

  // define a customized event
  const zoomId = new CustomEvent('zoom-map', { detail: { mapZoomSelect }}); // define your own event
  events.dispatchEvent(zoomId);
}

export {
  initializeParkEntry,
};
