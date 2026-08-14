import _ from 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/+esm';

const CENSUS_ENDPOINT = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';
const DEFAULT_BENCHMARK = 'PUBLIC_AR_CURRENT';
const SUGGESTION_MIN_CHARS = 3;
const SUGGESTION_LIMIT = 10;
const SUGGESTION_DEBOUNCE_MS = 350;
const CITY_SUFFIX = 'Philadelphia, PA';

function markInputError(input) {
  if (!input) return;
  input.classList.add('input-error');
  setTimeout(() => input.classList.remove('input-error'), 1600);
}

function setStatus(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('error', Boolean(isError));
}

let jsonpCounter = 0;

function ensureCityContext(text) {
  if (!text) return CITY_SUFFIX;
  const normalized = text.toLowerCase();
  if (normalized.includes('philadelphia')) return text.trim();
  return `${text.replace(/,+\s*$/, '').trim()}, ${CITY_SUFFIX}`;
}

function censusJsonp(params, signal) {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  return new Promise((resolve, reject) => {
    const callbackName = `__censusCallback${Date.now()}_${jsonpCounter++}`;
    const query = new URLSearchParams({ ...params, format: 'jsonp', callback: callbackName });
    const script = document.createElement('script');
    script.src = `${CENSUS_ENDPOINT}?${query.toString()}`;
    script.async = true;

    function cleanup() {
      if (script.parentNode) script.parentNode.removeChild(script);
      delete window[callbackName];
    }

    window[callbackName] = (data) => {
      if (signal?.aborted) {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      cleanup();
      resolve(data);
    };

    script.addEventListener('error', () => {
      cleanup();
      reject(new Error('Census JSONP request failed.'));
    });

    if (signal) {
      const abortHandler = () => {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      };
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    document.head.appendChild(script);
  });
}

async function fetchMatches(address, benchmark = DEFAULT_BENCHMARK, signal) {
  const queryAddress = ensureCityContext(address);
  const data = await censusJsonp({ address: queryAddress, benchmark }, signal);
  return Array.isArray(data?.result?.addressMatches) ? data.result.addressMatches : [];
}

async function geocodeAddress(address, benchmark = DEFAULT_BENCHMARK) {
  const matches = await fetchMatches(address, benchmark);
  const match = matches[0];
  if (!match || !match.coordinates) return null;

  const lat = Number(match.coordinates.y);
  const lng = Number(match.coordinates.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    latitude: lat,
    longitude: lng,
    matchedAddress: match.matchedAddress,
    tigerLineId: match.tigerLine?.tigerLineId,
    tigerLineSide: match.tigerLine?.side,
    raw: match,
  };
}

function matchToResult(match) {
  if (!match || !match.coordinates) return null;
  const latitude = Number(match.coordinates.y);
  const longitude = Number(match.coordinates.x);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude,
    matchedAddress: match.matchedAddress,
    raw: match,
  };
}

function renderSuggestions(listEl, matches, onSelect) {
  if (!listEl) return;
  listEl.innerHTML = '';
  const limited = matches.slice(0, SUGGESTION_LIMIT);
  if (!limited.length) {
    listEl.classList.remove('has-results');
    const empty = document.createElement('li');
    empty.className = 'suggestion-empty';
    empty.textContent = 'No matches found.';
    listEl.appendChild(empty);
    return;
  }
  listEl.classList.add('has-results');

  limited.forEach((match) => {
    const item = document.createElement('li');
    item.className = 'suggestion-item';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'suggestion-btn';
    button.textContent = match.matchedAddress || 'Unknown address';
    button.addEventListener('click', () => {
      if (typeof onSelect === 'function') onSelect(match);
      listEl.innerHTML = '';
      listEl.classList.remove('has-results');
    });
    item.appendChild(button);
    listEl.appendChild(item);
  });
}

export function initGeolocate(options = {}) {
  const {
    inputSelector = '#address-search',
    buttonSelector = '#address-search-submit',
    geolocateButtonSelector = '#geolocate',
    statusSelector = '[data-role="search-hint"]',
    suggestionListSelector = '#address-suggestions',
    map = null,
    flyToOptions = {},
    onPlaceResolved = null,
  } = options;

  const input = document.querySelector(inputSelector);
  if (!input) {
    console.warn('initGeolocate: input element not found');
    return null;
  }

  const button = document.querySelector(buttonSelector);
  const geolocateButton = document.querySelector(geolocateButtonSelector);
  const statusEl = document.querySelector(statusSelector);
  const suggestionList = document.querySelector(suggestionListSelector);
  if (geolocateButton && !geolocateButton.dataset.label) {
    geolocateButton.dataset.label = geolocateButton.textContent?.trim() || 'Use My Location';
  }

  let marker = null;
  if (map && window.mapboxgl) {
    marker = new window.mapboxgl.Marker({ color: '#0f5132' });
  }

  const setLoading = (isLoading) => {
    input.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    input.classList.toggle('is-loading', isLoading);
    if (button) button.disabled = isLoading;
  };

  const geoButtonLabel = geolocateButton?.dataset.label || 'Use My Location';
  const setGeoLoading = (isLoading) => {
    if (!geolocateButton) return;
    geolocateButton.disabled = isLoading;
    geolocateButton.classList.toggle('is-loading', isLoading);
    geolocateButton.textContent = isLoading ? 'Locating…' : geoButtonLabel;
  };

  const updateMapTo = (lat, lng) => {
    if (marker && typeof marker.setLngLat === 'function') {
      marker.setLngLat([lng, lat]).addTo(map);
    }

    if (map && typeof map.flyTo === 'function') {
      map.flyTo({
        center: [lng, lat],
        zoom: flyToOptions.zoom || 13,
        pitch: flyToOptions.pitch || 0,
        bearing: flyToOptions.bearing || 0,
        essential: true,
      });
    }
  };

  const handleResult = (result, statusMessage) => {
    if (!result || !Number.isFinite(result.latitude) || !Number.isFinite(result.longitude)) {
      markInputError(input);
      setStatus(statusEl, 'No exact match found. Try a more complete address.', true);
      return;
    }

    updateMapTo(result.latitude, result.longitude);

    if (typeof onPlaceResolved === 'function') {
      onPlaceResolved(result);
    }

    const label = result.matchedAddress || 'Selected location';
    setStatus(statusEl, statusMessage || `Matched: ${label}`, false);
  };

  if (geolocateButton) {
    if (!('geolocation' in navigator)) {
      geolocateButton.disabled = true;
      geolocateButton.title = 'Geolocation is not supported in this browser.';
    } else {
      geolocateButton.addEventListener('click', () => {
        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setGeoLoading(false);
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            handleResult(
              {
                latitude,
                longitude,
                matchedAddress: 'Your current location',
              },
              'Using your current location.',
            );
          },
          (error) => {
            setGeoLoading(false);
            console.error('Geolocation error:', error);
            setStatus(statusEl, 'Unable to retrieve your location. Please allow access and try again.', true);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
      });
    }
  }

  const lookup = async () => {
    const query = input.value.trim();
    if (!query) {
      markInputError(input);
      setStatus(statusEl, 'Enter a full street address to search.', true);
      return;
    }

    try {
      setLoading(true);
      setStatus(statusEl, 'Searching U.S. Census geocoder…', false);
      const result = await geocodeAddress(query);
      handleResult(result);
      if (suggestionList) {
        suggestionList.innerHTML = '';
        suggestionList.classList.remove('has-results');
      }
    } catch (err) {
      console.error('Census geocoding failed:', err);
      markInputError(input);
      setStatus(statusEl, 'Lookup failed. Please try again.', true);
    } finally {
      setLoading(false);
    }
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      lookup();
    }
  });

  if (button) {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      lookup();
    });
  }

  if (suggestionList) {
    let activeController = null;
    const suggestionFetcher = async (value) => {
      if (value.length < SUGGESTION_MIN_CHARS) {
        if (activeController) {
          activeController.abort();
          activeController = null;
        }
        suggestionList.innerHTML = '';
        suggestionList.classList.remove('has-results');
        return;
      }

      if (activeController) {
        activeController.abort();
      }
      activeController = new AbortController();
      try {
        const matches = await fetchMatches(value, DEFAULT_BENCHMARK, activeController.signal);
        renderSuggestions(suggestionList, matches, (match) => {
          const normalized = matchToResult(match);
          if (!normalized) {
            markInputError(input);
            setStatus(statusEl, 'Unable to use that suggestion. Try another.', true);
            return;
          }
          input.value = normalized.matchedAddress || input.value;
          handleResult(normalized);
        });
        suggestionList.classList.toggle('has-results', matches.length > 0);
        if (matches.length) {
          setStatus(statusEl, 'Pick an address suggestion or press Enter to search.', false);
        } else {
          setStatus(statusEl, 'No suggestions yet. Try adding more details.', true);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Suggestion fetch failed:', err);
      } finally {
        activeController = null;
      }
    };
    const requestSuggestions = typeof _.debounce === 'function'
      ? _.debounce(suggestionFetcher, SUGGESTION_DEBOUNCE_MS)
      : suggestionFetcher;

    input.addEventListener('input', () => {
      const value = input.value.trim();
      if (!value) {
        suggestionList.innerHTML = '';
        suggestionList.classList.remove('has-results');
        return;
      }
      requestSuggestions(value);
    });
  }

  return { lookup };
}
