
function setupSearchControls(communities, map) {
  
  const elements = {
    searchInput: document.getElementById('address-search'),
    searchButton: document.getElementById('search-button'),
    timeRangeSelect: document.getElementById('time-range'),
    loadingIndicator: createLoadingIndicator()
  };

  // state management
  const state = {
    timeRangeChanged: false,
    currentTimeRange: elements.timeRangeSelect.value || '6months',
    communityListContainer: null,
    debounceTimer: null
  };

  // constants
  const constants = {
    VALID_TIME_RANGES: ['6months', '1year', '2years'],
    DEBOUNCE_DELAY: 300,
    SEARCH_ERROR_ID: 'search-error'
  };

  // initialize search controls
  function init() {
    bindEvents();
    createCommunityListContainer();
  }

  // bind events
  function bindEvents() {
    elements.searchButton.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keypress', handleEnterKey);
    elements.searchInput.addEventListener('input', handleRealTimeSearch);
    elements.timeRangeSelect.addEventListener('change', handleTimeRangeChange);
    document.addEventListener('click', handleClickOutside);
  }

  // other helper functions
  function createLoadingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'loading-indicator';
    indicator.textContent = 'Querying data, please wait...';
    indicator.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px 25px;
      border-radius: 5px;
      z-index: 10000;
      font-size: 16px;
      display: none;
      pointer-events: none;
    `;
    document.body.appendChild(indicator);
    return indicator;
  }

  function createCommunityListContainer() {
    if (state.communityListContainer) return state.communityListContainer;

    const container = document.createElement('div');
    container.id = 'community-list';
    container.className = 'community-list';
    container.style.display = 'none';
    elements.searchInput.parentNode.insertBefore(container, elements.searchInput.nextSibling);
    
    state.communityListContainer = container;
    return container;
  }

  function showCommunityList(matchingCommunities) {
    const container = state.communityListContainer;
    container.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'community-list-title';
    title.textContent = `${matchingCommunities.length} matching communities:`;
    container.appendChild(title);

    const list = document.createElement('ul');
    list.className = 'community-items';
    const fragment = document.createDocumentFragment();

    matchingCommunities.forEach(community => {
      const communityName = community.properties.name || community.properties.MAPNAME || 'Unknown Community';
      const listItem = document.createElement('li');
      listItem.className = 'community-item';
      listItem.textContent = communityName;
      
      listItem.addEventListener('click', () => {
        elements.searchInput.value = communityName;
        hideCommunityList();
      });
      
      fragment.appendChild(listItem);
    });
    
    list.appendChild(fragment);
    container.appendChild(list);
    container.style.display = 'block';
  }

  function hideCommunityList() {
    state.communityListContainer.style.display = 'none';
  }

  function debounce(func, delay) {
    return function(...args) {
      clearTimeout(state.debounceTimer);
      state.debounceTimer = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }

  function searchCommunities(searchTerm) {
    if (!communities?.features?.length) return [];

    const lowerTerm = searchTerm.toLowerCase();
    return communities.features.filter(feature => {
      if (!feature?.properties) return false;

      const name = (feature.properties.name || '').toLowerCase();
      const mapName = (feature.properties.MAPNAME || '').toLowerCase();
      const neighborhood = (feature.properties.neighborhood || '').toLowerCase();
      const communityId = (feature.id || '').toLowerCase();

      return name.includes(lowerTerm) ||
             mapName.includes(lowerTerm) ||
             neighborhood.includes(lowerTerm) ||
             communityId.includes(lowerTerm) ||
             name === lowerTerm ||
             mapName === lowerTerm;
    });
  }

  const handleRealTimeSearch = debounce((e) => {
    const searchTerm = e.target.value.trim();
    hideCommunityList();

    if (!searchTerm) return;

    const foundCommunities = searchCommunities(searchTerm);
    if (foundCommunities.length > 1) {
      showCommunityList(foundCommunities);
    }
  }, constants.DEBOUNCE_DELAY);

  async function handleSearch() {
    map?.closePopup?.();
    window.safetyMap?.closePopup?.();

    removeSearchError();

    

    const searchTerm = elements.searchInput.value.trim();
    if (!searchTerm) {
      showSearchError('Please enter a community name');
      return;
    }

    await handleTimeRangeUpdate();

    const foundCommunities = searchCommunities(searchTerm);
    if (foundCommunities.length > 0) {
      window.mapApi.highlightAreaByName(foundCommunities[0].realName || foundCommunities[0].properties.name);
      performMapLocation(foundCommunities[0]);
    } else {
      showSearchError('No matching community found');
    }
  }

  async function handleTimeRangeUpdate() {
    try {
      showLoading();

      const currentRange = state.currentTimeRange;
      const selectedCrimeTypes = getSelectedCrimeTypes();
      

      let trends = window.appState?.safetyTrends?.[currentRange];
      
      // ensures that different crime type filters produce different results
      if (window.loadCrimeData && window.calculateSafetyTrends && window.communitiesData) {
        const crimeData = await window.loadCrimeData(currentRange);
        trends = window.calculateSafetyTrends(window.communitiesData, crimeData, currentRange, selectedCrimeTypes);
        
        // update state
        if (!window.appState.safetyTrends) window.appState.safetyTrends = {};
        window.appState.safetyTrends[currentRange] = trends;
      }
      
      window.safetyTrends = trends;
      
      // update map
      if (trends && window.communitiesData && window.safetyMap && window.showCommunitiesOnMap) {
        window.showCommunitiesOnMap(window.communitiesData, window.safetyMap, trends, currentRange, selectedCrimeTypes);
      }
      
      // reset state change flag
      state.timeRangeChanged = false;
    } catch (error) {
      console.error('Time range update failed:', error);
      alert(`Failed to load ${state.currentTimeRange} data. Please try again later.`);
    } finally {
      hideLoading();
    }
  }
  
  // select crime types
  function getSelectedCrimeTypes() {
    const selectedTypes = [];
    const checkboxes = document.querySelectorAll('input[name="crime-type"]:checked');
    
    checkboxes.forEach(checkbox => {
      selectedTypes.push(checkbox.value);
    });
    
    return selectedTypes;
  }

  // map location
  function performMapLocation(community) {
    const communityName = community.properties.name || community.properties.MAPNAME || 'Unknown Community';
    console.log(`Located community: "${communityName}"`);

    window.processSingleCommunity?.(community);
  }

  // other helper functions
  function showSearchError(message) {
    removeSearchError();

    const errorElement = document.createElement('div');
    errorElement.id = constants.SEARCH_ERROR_ID;
    errorElement.textContent = message;
    errorElement.style.cssText = `
      color: red;
      font-size: 12px;
      margin: 2px 0 0 2px;
      font-weight: bold;
      height: 16px;
    `;

    const parent = elements.searchInput.parentNode;
    parent.insertBefore(errorElement, elements.searchInput.nextSibling);
  }

  function removeSearchError() {
    const errorElement = document.getElementById(constants.SEARCH_ERROR_ID);
    if (errorElement) errorElement.remove();
  }

  function handleEnterKey(e) {
    if (e.key === 'Enter') handleSearch();
  }

  function handleTimeRangeChange() {
    const selectedRange = elements.timeRangeSelect.value;
    const normalizedRange = constants.VALID_TIME_RANGES.includes(selectedRange)
      ? selectedRange
      : '6months';

    if (normalizedRange !== state.currentTimeRange) {
      state.currentTimeRange = normalizedRange;
      state.timeRangeChanged = true;
      console.log(`Time range updated to: ${normalizedRange}`);
    }
  }

  function handleClickOutside(e) {
    const { searchInput, searchButton } = elements;
    const { communityListContainer } = state;

    if (communityListContainer && !communityListContainer.contains(e.target) &&
        !searchInput.contains(e.target) && !searchButton.contains(e.target)) {
      hideCommunityList();
    }
  }

  function showLoading() {
    elements.loadingIndicator.style.display = 'block';
  }

  function hideLoading() {
    elements.loadingIndicator.style.display = 'none';
  }

  init();

  return {
    search: handleSearch,
    setTimeRange: (range) => {
      if (constants.VALID_TIME_RANGES.includes(range)) {
        elements.timeRangeSelect.value = range;
        handleTimeRangeChange();
      }
    },
    destroy: () => {
      elements.searchButton.removeEventListener('click', handleSearch);
      elements.searchInput.removeEventListener('keypress', handleEnterKey);
      elements.searchInput.removeEventListener('input', handleRealTimeSearch);
      elements.timeRangeSelect.removeEventListener('change', handleTimeRangeChange);
      document.removeEventListener('click', handleClickOutside);
      clearTimeout(state.debounceTimer);
    }
  };
}

export { setupSearchControls };