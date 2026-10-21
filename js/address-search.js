const endpoint = 'https://geocoding.geo.census.gov/geocoder/geographies/address';
const vintage = 'Census2020_Current';
let nextRequest = 0;
const registries = new WeakMap();

/**
 * Build a key-free lookup for Philadelphia streets and 2020 tract geography.
 * @param {string} street Street number and name.
 * @param {string} zip Optional five-digit ZIP code.
 * @param {string} callback Generated JSONP callback, never user supplied.
 * @return {URL} Census request URL.
 */
export function addressURL(street, zip, callback) {
  if (!/^\d\S*\s+\S/.test(street.trim()) || street.length > 200) {
    throw new Error('Enter a street number and street name.');
  }
  if (zip && !/^\d{5}$/.test(zip)) throw new Error('Enter a five-digit ZIP code or leave it blank.');
  if (!/^phlAddressCallbacks\.lookup\d+$/.test(callback)) throw new Error('Invalid lookup callback.');
  const url = new URL(endpoint);
  url.search = new URLSearchParams({street: street.trim(), city: 'Philadelphia', state: 'PA',
    zip, benchmark: 'Public_AR_Current', vintage, layers: 'Census Tracts', format: 'jsonp', callback});
  return url;
}

/**
 * Request Census JSONP, its documented browser transport (no CORS support).
 * @param {string} street Street number and name.
 * @param {string} zip Optional ZIP code.
 * @param {Object} options Cancellation, timeout, and injectable browser objects.
 * @return {Promise} Geocoder response; never persisted by this application.
 */
export function requestAddress(street, zip, {signal, timeout = 20000,
  ownerWindow = window, ownerDocument = document} = {}) {
  let registry = registries.get(ownerWindow);
  if (!registry) {
    // late responses after cancellation resolve to a no-op, not a stale selection
    registry = new Proxy(Object.create(null), {get: (target, name) => target[name] || (() => {})});
    ownerWindow.phlAddressCallbacks = registry;
    registries.set(ownerWindow, registry);
  }
  const id = `lookup${++nextRequest}`;
  const url = addressURL(street, zip, `phlAddressCallbacks.${id}`);
  return new Promise((resolve, reject) => {
    const script = ownerDocument.createElement('script');
    let settled = false;
    let timer = null;
    const finish = (error, response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      script.remove();
      delete registry[id];
      if (error) reject(error);
      else resolve(response);
    };
    const cancel = () => finish(new Error('cancelled'));
    registry[id] = (response) => finish(null, response);
    script.src = url.href;
    script.referrerPolicy = 'no-referrer';
    script.onerror = () => finish(new Error('unavailable'));
    script.onload = () => {
      if (!settled) finish(new Error('unavailable'));
    };
    if (signal?.aborted) {
      cancel();
      return;
    }
    signal?.addEventListener('abort', cancel, {once: true});
    timer = setTimeout(() => finish(new Error('unavailable')), timeout);
    ownerDocument.head.append(script);
  });
}

/**
 * Accept only unambiguous 2020 tract IDs already in the dashboard exports.
 * @param {Object} response Census response.
 * @param {Map} features Canonical tract features, keyed by character GEOID.
 * @return {Array} Confirmable address/tract matches, without point coordinates.
 */
export function addressMatches(response, features) {
  if (response?.result?.input?.vintage?.vintageName !== vintage ||
      !Array.isArray(response?.result?.addressMatches)) {
    throw new Error('Invalid Census response.');
  }
  const matches = [];
  const seen = new Set();
  for (const match of response.result.addressMatches) {
    const tracts = match.geographies?.['Census Tracts'];
    if (!Array.isArray(tracts) || tracts.length !== 1) continue;
    const geoid = tracts[0].GEOID;
    if (typeof geoid !== 'string' || !/^42101\d{6}$/.test(geoid) || !features.has(geoid) ||
        typeof match.matchedAddress !== 'string' || match.matchedAddress.length > 300) continue;
    const key = `${geoid}:${match.matchedAddress}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push({geoid, label: match.matchedAddress, tractName: features.get(geoid).properties.tract_name});
  }
  return matches;
}

/**
 * Wire explicit submit/confirmation to the dashboard's existing tract selection.
 * @param {Object} data Validated R exports.
 * @param {Function} selectAddressTract Reset filters and select a canonical tract.
 * @param {Function} lookup Injectable Census transport for offline UI tests.
 */
export function initializeAddressSearch(data, selectAddressTract, lookup = requestAddress) {
  const form = document.querySelector('#address-form');
  const street = document.querySelector('#address-street');
  const zip = document.querySelector('#address-zip');
  const submit = document.querySelector('#address-submit');
  const status = document.querySelector('#address-status');
  const results = document.querySelector('#address-results');
  const features = new Map(data.collection.features.map((f) => [f.properties.tract_geoid, f]));
  let controller;
  let sequence = 0;
  const clearLookup = () => {
    sequence += 1;
    controller?.abort();
    controller = null;
    submit.disabled = false;
    form.removeAttribute('aria-busy');
    results.replaceChildren();
    status.textContent = '';
  };
  street.addEventListener('input', clearLookup);
  zip.addEventListener('input', clearLookup);
  document.querySelector('#address-clear').addEventListener('click', () => {
    clearLookup();
    street.value = '';
    zip.value = '';
    status.textContent = 'Address cleared. Tract selection unchanged.';
    street.focus();
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearLookup();
    try {
      addressURL(street.value.trim(), zip.value.trim(), 'phlAddressCallbacks.lookup0');
    } catch (error) {
      status.textContent = error.message;
      return;
    }
    const current = sequence;
    controller = new AbortController();
    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Looking up the address with Census…';
    try {
      const response = await lookup(street.value.trim(), zip.value.trim(), {signal: controller.signal});
      if (current !== sequence) return;
      const matches = addressMatches(response, features);
      if (!matches.length) {
        status.textContent = 'No matching Philadelphia tract. Check the street and ZIP code.';
        return;
      }
      for (const match of matches) {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = `${match.label}, tract ${match.tractName}. Select tract`;
        button.addEventListener('click', () => {
          if (current !== sequence || !selectAddressTract(match.geoid)) return;
          status.textContent = `Selected tract ${match.tractName}. Tract filters cleared.`;
        });
        item.append(button);
        results.append(item);
      }
      status.textContent = `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}. Confirm the address below to select its tract.`;
    } catch {
      if (current === sequence) status.textContent = 'Census address lookup is unavailable. Try again, or select a tract on the map or table.';
    } finally {
      if (current === sequence) {
        submit.disabled = false;
        form.removeAttribute('aria-busy');
        controller = null;
      }
    }
  });
  document.querySelector('#address-controls').disabled = false;
}
