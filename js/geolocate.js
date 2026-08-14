let googleLoaderPromise = null;

const PUBLIC_GOOGLE_MAPS_KEY = 'AIzaSyDogPZ_v0_Z9TgTufJTu5aPsgyqXYu8bVI';
const DEFAULT_PLACE_FIELDS = ['geometry', 'formatted_address', 'address_components'];
const MIN_QUERY_LENGTH = 3;
const INPUT_DEBOUNCE_MS = 180;
const DEFAULT_HINT_MESSAGE = 'Type at least three characters to see suggestions';
const BROWSER_GEO_TIMEOUT_MS = 10000;
const BROWSER_GEO_MAX_AGE_MS = 60000;

function resolveApiKey(explicitKey) {
  return explicitKey || window.GOOGLE_MAPS_KEY || PUBLIC_GOOGLE_MAPS_KEY;
}

function loadGooglePlaces(explicitKey) {
  const apiKey = resolveApiKey(explicitKey);
  if (window.google && window.google.maps && window.google.maps.places) {
    return Promise.resolve(window.google);
  }

  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API key missing. Set window.GOOGLE_MAPS_KEY.'));
  }

  if (googleLoaderPromise) return googleLoaderPromise;

  googleLoaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = 'true';
    script.addEventListener('load', () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        resolve(window.google);
      } else {
        reject(new Error('Google Maps script loaded but Places library unavailable.'));
      }
    });
    script.addEventListener('error', () => reject(new Error('Failed to load Google Maps script.')));
    document.head.appendChild(script);
  });

  return googleLoaderPromise;
}

function debounce(fn, delay = 0) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

function markInputError(input) {
  if (!input) return;
  input.classList.add('input-error');
  setTimeout(() => input.classList.remove('input-error'), 1600);
}

function updateHint(hintEl, message, isError = false) {
  if (!hintEl) return;
  hintEl.textContent = message;
  hintEl.classList.toggle('error', Boolean(isError));
}

function setButtonLoadingState(button, isLoading, loadingLabel = 'Locating…') {
  if (!button) return;
  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent.trim();
  }
  button.disabled = isLoading;
  button.classList.toggle('is-loading', isLoading);
  button.textContent = isLoading ? loadingLabel : button.dataset.defaultLabel;
}

export async function initGeolocate(options = {}) {
  const {
    inputSelector = '#address-search',
    suggestionsSelector = '#address-suggestions',
    hintSelector = '#address-search-hint',
    geolocateButtonSelector = '#use-my-location',
    map = null,
    apiKey = PUBLIC_GOOGLE_MAPS_KEY,
    flyToOptions = {},
    onPlaceResolved = null,
    minQueryLength = MIN_QUERY_LENGTH,
    inputDebounceMs = INPUT_DEBOUNCE_MS,
  } = options;

  const input = document.querySelector(inputSelector);
  const suggestionsEl = document.querySelector(suggestionsSelector);
  const hintEl = document.querySelector(hintSelector);
  const geolocateButton = document.querySelector(geolocateButtonSelector);
  if (!input) {
    console.warn('initGeolocate: input element not found');
    return null;
  }

  let google;
  try {
    google = await loadGooglePlaces(apiKey);
  } catch (err) {
    console.error(err);
    markInputError(input);
    updateHint(hintEl, 'Unable to load Google Places', true);
    return null;
  }

  const autocompleteService = new google.maps.places.AutocompleteService();
  const placesService = new google.maps.places.PlacesService(document.createElement('div'));
  const geocoder = new google.maps.Geocoder();
  let marker = null;
  if (map && window.mapboxgl) {
    marker = new window.mapboxgl.Marker({ color: '#0f5132' });
  }

  const setGeolocateButtonState = (isLoading) => setButtonLoadingState(geolocateButton, isLoading);

  let requestToken = 0;
  const clearSuggestions = () => {
    if (!suggestionsEl) return;
    suggestionsEl.innerHTML = '';
    suggestionsEl.classList.remove('has-results');
  };

  const renderSuggestions = (predictions) => {
    if (!suggestionsEl) return;
    suggestionsEl.innerHTML = '';
    if (!predictions || !predictions.length) {
      const item = document.createElement('li');
      item.className = 'suggestion-empty';
      item.textContent = input.value.trim().length >= minQueryLength ? 'No addresses found' : 'Keep typing to see suggestions';
      suggestionsEl.appendChild(item);
      suggestionsEl.classList.remove('has-results');
      return;
    }

    suggestionsEl.classList.add('has-results');
    predictions.forEach((prediction) => {
      const listItem = document.createElement('li');
      listItem.className = 'suggestion-item';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'suggestion-btn';
      button.textContent = prediction.description;
      button.setAttribute('role', 'option');
      button.addEventListener('click', () => handleSuggestionSelection(prediction));
      listItem.appendChild(button);
      suggestionsEl.appendChild(listItem);
    });
  };

  const applyPlaceToMap = (place, { hintMessage = 'Showing Google suggestions', isError = false } = {}) => {
    if (!place || !place.geometry || !place.geometry.location) {
      markInputError(input);
      updateHint(hintEl, 'Unable to locate that address', true);
      return;
    }

    const lat = typeof place.geometry.location.lat === 'function'
      ? place.geometry.location.lat()
      : place.geometry.location.lat;
    const lng = typeof place.geometry.location.lng === 'function'
      ? place.geometry.location.lng()
      : place.geometry.location.lng;

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

    if (typeof onPlaceResolved === 'function') {
      onPlaceResolved({ place, latitude: lat, longitude: lng });
    }

    updateHint(hintEl, hintMessage, isError);
  };

  const handleSuggestionSelection = (prediction) => {
    if (!prediction || !prediction.place_id) {
      markInputError(input);
      return;
    }
    input.value = prediction.description;
    clearSuggestions();
    updateHint(hintEl, 'Locating address…');
    placesService.getDetails(
      {
        placeId: prediction.place_id,
        fields: DEFAULT_PLACE_FIELDS,
      },
      (placeResult, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK) {
          markInputError(input);
          updateHint(hintEl, 'Failed to fetch that address', true);
          return;
        }
        applyPlaceToMap(placeResult);
      },
    );
  };

  const requestPredictions = debounce((query, token) => {
    autocompleteService.getPlacePredictions(
      {
        input: query,
        types: ['address'],
        componentRestrictions: { country: 'us' },
      },
      (predictions, status) => {
        if (token !== requestToken) return;
        if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions || !predictions.length) {
          renderSuggestions([]);
          return;
        }
        renderSuggestions(predictions);
      },
    );
  }, inputDebounceMs);

  const handleInputChange = () => {
    const value = input.value.trim();
    if (value.length < minQueryLength) {
      requestToken += 1;
      clearSuggestions();
      return;
    }
    requestToken += 1;
    requestPredictions(value, requestToken);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (!document.activeElement || document.activeElement.closest('.suggestions-list') !== suggestionsEl) {
        clearSuggestions();
      }
    }, 150);
  };

  const handleGeolocateClick = () => {
    if (!navigator.geolocation) {
      updateHint(hintEl, 'Your browser does not support geolocation', true);
      markInputError(input);
      return;
    }

    clearSuggestions();
    setGeolocateButtonState(true);
    updateHint(hintEl, 'Locating your position…');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = { lat: latitude, lng: longitude };
        const fallbackPlace = { geometry: { location } };

        const finish = (place, hintMessage) => {
          const normalizedPlace = place && place.geometry ? place : { ...place, geometry: { location } };
          const displayAddress = normalizedPlace.formatted_address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          normalizedPlace.formatted_address = displayAddress;
          input.value = displayAddress;
          applyPlaceToMap(normalizedPlace, { hintMessage });
          setGeolocateButtonState(false);
        };

        geocoder.geocode({ location }, (results, status) => {
          if (status === 'OK' && results && results.length) {
            finish(results[0], 'Centered on your current location');
            return;
          }
          finish(fallbackPlace, 'Centered on detected coordinates');
        });
      },
      (error) => {
        setGeolocateButtonState(false);
        let message = 'Unable to get your location';
        switch (error.code) {
        case 1:
          message = 'Location permission was denied';
          break;
        case 2:
          message = 'Unable to determine your location';
          break;
        case 3:
          message = 'Timed out while finding your location';
          break;
        default:
          break;
        }
        updateHint(hintEl, message, true);
        markInputError(input);
      },
      {
        enableHighAccuracy: true,
        timeout: BROWSER_GEO_TIMEOUT_MS,
        maximumAge: BROWSER_GEO_MAX_AGE_MS,
      },
    );
  };

  input.addEventListener('input', handleInputChange);
  input.addEventListener('focus', handleInputChange);
  input.addEventListener('blur', handleBlur);

  if (suggestionsEl) {
    suggestionsEl.addEventListener('blur', (event) => {
      if (!event.relatedTarget || !suggestionsEl.contains(event.relatedTarget)) {
        clearSuggestions();
      }
    }, true);
  }

  if (geolocateButton) {
    geolocateButton.addEventListener('click', handleGeolocateClick);
  }

  updateHint(hintEl, DEFAULT_HINT_MESSAGE);

  return {
    clear: clearSuggestions,
    destroy() {
      input.removeEventListener('input', handleInputChange);
      input.removeEventListener('focus', handleInputChange);
      input.removeEventListener('blur', handleBlur);
      if (geolocateButton) {
        geolocateButton.removeEventListener('click', handleGeolocateClick);
      }
      clearSuggestions();
    },
  };
}
