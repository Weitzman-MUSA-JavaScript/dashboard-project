const parkList = document.querySelector('.park-list');

function initializeList(parks, events) {
  addParksToList(parks, events);
  return parkList;
}

function addParksToList(parks, events) {
  let html = '';
  for (const park of parks.features) {
    const name = park.properties.ASSET_NAME;
    const parent = park.properties.CHILD_OF;
    const use = park.properties.USE_;

    const parkListItemHTML = ` 
    <li data-parkid="${park.id}">
      <div class="park-name" data-parkid="${park.id}">${name}</div>
      <div class="park-parent" data-parkid="${park.id}">${parent}</div>
      <div class="park-use" data-parkid="${park.id}">${use}</div>
    </li>
    `; // remember to include parkid everywhere...so the click will work no matter where you click
    html += parkListItemHTML; // shortcut of saying html = html + schoolListItemHTML
  }
  parkList.innerHTML = html;

  const choices = parkList.querySelectorAll('li'); // select all the children of park list that match li
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

  // define a customized event
  const zoomId = new CustomEvent('zoom-map', { detail: { mapZoomSelect }}); // define your own event
  events.dispatchEvent(zoomId);
}

export {
  initializeList,
};
