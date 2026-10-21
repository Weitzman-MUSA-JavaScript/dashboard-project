/**
 * Builds the DOM for list rows and map popups.
 * Text from the data is always inserted with textContent, never innerHTML,
 * because community-reported names and notes could contain markup.
 */

import {
  ACCESS_LABELS, KIND_LABELS,
  formatDistance, formatWalk, weeklyHours,
} from './format.js';

/** Create an element with an optional class and text. */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined && text !== null) {
    node.textContent = text;
  }
  return node;
}

function safeLink(url, text) {
  const link = el('a', null, text);
  if (/^https?:\/\//.test(url)) {
    link.href = url;
  }
  link.target = '_blank';
  link.rel = 'noopener';
  return link;
}

function tagList(place) {
  const tags = el('ul', 'tags');
  tags.setAttribute('aria-label', 'Details');
  tags.append(el('li', `tag tag-${place.access}`, ACCESS_LABELS[place.access]));
  tags.append(el('li', 'tag', KIND_LABELS[place.kind]));
  if (place.wheelchair) {
    tags.append(el('li', 'tag', 'Wheelchair accessible'));
  }
  if (place.changingTable) {
    tags.append(el('li', 'tag', 'Changing table'));
  }
  if (place.genderNeutral) {
    tags.append(el('li', 'tag', 'Gender-neutral'));
  }
  if (place.verified) {
    tags.append(el('li', 'tag tag-verified', 'Verified hours'));
  }
  return tags;
}

/** One row in the results list. The name is a button that selects the place. */
function buildListItem(place, onSelect) {
  const item = el('li', `result result-${place.statusInfo.status}`);
  item.dataset.id = place.id;

  const header = el('div', 'result-header');
  const heading = el('h2', 'result-name');
  const button = el('button', 'result-button', place.name);
  button.type = 'button';
  button.addEventListener('click', () => onSelect(place));
  heading.append(button);
  header.append(heading);
  header.append(el('span', 'result-distance', `${formatDistance(place.distance)}, ${formatWalk(place.distance)}`));
  item.append(header);

  item.append(el('p', `result-status status-${place.statusInfo.status}`, place.statusInfo.text));
  item.append(tagList(place));
  return item;
}

/** The popup shown on the map for a selected place. */
function buildPopup(place) {
  const box = el('div', 'popup');
  box.append(el('h3', 'popup-name', place.name));
  box.append(el('p', `popup-status status-${place.statusInfo.status}`, place.statusInfo.text));
  if (place.address) {
    box.append(el('p', 'popup-address', place.address));
  }
  box.append(tagList(place));

  if (place.note) {
    box.append(el('p', 'popup-note', place.note));
  }

  const week = weeklyHours(place.schedule);
  if (week) {
    const table = el('table', 'popup-hours');
    const caption = el('caption', null, place.verified ? 'Hours (verified)' : 'Hours (from OpenStreetMap)');
    table.append(caption);
    const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
    for (const [day, hours] of week) {
      const row = el('tr', day === today ? 'is-today' : null);
      const th = el('th', null, day);
      th.scope = 'row';
      row.append(th, el('td', null, hours));
      table.append(row);
    }
    box.append(table);
  }

  const actions = el('p', 'popup-actions');
  const directions = safeLink(
    `https://www.google.com/maps/dir/?api=1&destination=${place.latlng.lat},${place.latlng.lng}&travelmode=walking`,
    'Walking directions',
  );
  directions.className = 'popup-directions';
  actions.append(directions);
  box.append(actions);

  const source = el('p', 'popup-source');
  source.append('Source: ');
  source.append(safeLink(place.url, place.source));
  if (place.updated) {
    source.append(`, updated ${place.updated}`);
  }
  box.append(source);
  return box;
}

export { el, buildListItem, buildPopup };
