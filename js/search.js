export function setupCitySearch(inputEl, cities, onSelect, onError) {
  if (!inputEl || !Array.isArray(cities)) {
    return null;
  }
  if (!window.Fuse) {
    console.warn("Fuse.js is required for city search suggestions.");
    return null;
  }

  const fuse = new window.Fuse(cities, {
    keys: [
      { name: "city", weight: 0.5 },
      { name: "admin", weight: 0.2 },
      { name: "country", weight: 0.3 },
      { name: "value", weight: 0.7 },
    ],
    ignoreLocation: true,
    threshold: 0.3,
    minMatchCharLength: 2,
  });

  const cityLookup = new Map();
  cities.forEach((city) => {
    cityLookup.set(city.value.toLowerCase(), city);
  });

  const dataList = document.createElement("datalist");
  dataList.id = "city-options";
  document.body.appendChild(dataList);
  inputEl.setAttribute("list", dataList.id);

  const renderOptions = (value) => {
    dataList.innerHTML = "";
    if (!value || value.trim().length < 2) {
      return;
    }
    const results = fuse.search(value.trim(), { limit: 8 });
    results.forEach(({ item }) => {
      const option = document.createElement("option");
      option.value = item.value;
      option.dataset.lat = item.lat;
      option.dataset.lng = item.lng;
      option.dataset.country = item.country;
      dataList.appendChild(option);
    });
  };

  const resolveCity = (query) => {
    if (!query) return null;
    const normalized = query.trim().toLowerCase();
    if (cityLookup.has(normalized)) {
      return cityLookup.get(normalized);
    }
    const [first] = fuse.search(query, { limit: 1 });
    return first ? first.item : null;
  };

  const handleSelect = () => {
    const city = resolveCity(inputEl.value);
    if (city) {
      if (typeof onSelect === "function") {
        onSelect(city);
      }
    } else if (typeof onError === "function") {
      onError(new Error("City not found. Try another name."));
    }
  };

  inputEl.addEventListener("input", (event) => {
    renderOptions(event.target.value);
  });

  inputEl.addEventListener("change", () => {
    handleSelect();
  });

  inputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSelect();
    }
  });

  inputEl.addEventListener("focus", () => {
    renderOptions(inputEl.value);
  });

  return {
    resolveCity,
  };
}

export function setupGeolocation(buttonEl, onSuccess, onError) {
  if (!buttonEl) return;
  const defaultLabel = buttonEl.textContent;

  buttonEl.addEventListener("click", () => {
    if (!navigator.geolocation) {
      if (typeof onError === "function") {
        onError(new Error("Geolocation is not supported by this browser."));
      }
      return;
    }
    buttonEl.disabled = true;
    buttonEl.textContent = "Locating…";

    navigator.geolocation.getCurrentPosition((position) => {
      buttonEl.disabled = false;
      buttonEl.textContent = defaultLabel;
      if (typeof onSuccess === "function") {
        onSuccess({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      }
    }, (error) => {
      buttonEl.disabled = false;
      buttonEl.textContent = defaultLabel;
      if (typeof onError === "function") {
        onError(error);
      }
    }, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}
