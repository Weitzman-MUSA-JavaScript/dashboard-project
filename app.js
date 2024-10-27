let map;
let directionsService;
let directionsRenderer;
let stopCount = 0;
let startMarker;
let destinationMarker;
let selecting = '';  // Indicates whether we're selecting 'start' or 'destination'
let geocoder;        // Initialize Geocoder for reverse geocoding

// Initialize Google Maps and Places Autocomplete
function initMap() {
  try {
    // Initialize the map
    map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 48.8566, lng: 2.3522 }, // Paris coordinates
      zoom: 13,
      mapId: '481396a3f2e286b5' // Optional: Apply a specific Map ID if available
    });

    // Initialize direction services
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    // Initialize the Geocoder
    geocoder = new google.maps.Geocoder();

    // Enable autocomplete for start and destination fields
    const autocompleteStart = new google.maps.places.Autocomplete(document.getElementById('start'));
    const autocompleteDestination = new google.maps.places.Autocomplete(document.getElementById('destination'));

    // Add click event listener to the map for picking locations
    map.addListener('click', (event) => {
      if (selecting === 'start') {
        setStartLocation(event.latLng);
      } else if (selecting === 'destination') {
        setDestinationLocation(event.latLng);
      }
    });

    // Fetch dynamic recommendations when the start location changes
    autocompleteStart.addListener('place_changed', fetchRecommendations);

  } catch (error) {
    console.error('Error initializing map:', error);
  }
}

// Reverse geocode to get the place name for start location
function setStartLocation(location) {
  if (startMarker) {
    startMarker.setMap(null);
  }

  startMarker = new google.maps.Marker({
    position: location,
    map: map,
    title: 'Start Location'
  });

  geocoder.geocode({ location: location }, function (results, status) {
    if (status === 'OK' && results[0]) {
      document.getElementById('start').value = results[0].formatted_address;
    } else {
      console.error('Geocoder failed due to: ' + status);
      document.getElementById('start').value = location.lat() + ', ' + location.lng();
    }
  });

  selecting = '';
}

// Reverse geocode to get the place name for destination location
function setDestinationLocation(location) {
  if (destinationMarker) {
    destinationMarker.setMap(null);
  }

  destinationMarker = new google.maps.Marker({
    position: location,
    map: map,
    title: 'Destination Location'
  });

  geocoder.geocode({ location: location }, function (results, status) {
    if (status === 'OK' && results[0]) {
      document.getElementById('destination').value = results[0].formatted_address;
    } else {
      console.error('Geocoder failed due to: ' + status);
      document.getElementById('destination').value = location.lat() + ', ' + location.lng();
    }
  });

  selecting = '';
}

// Fetch dynamic recommendations using Geoapify API (Update your API key)
async function fetchRecommendations() {
  const startLocation = document.getElementById('start').value;

  if (startLocation) {
    const apiUrl = `https://api.geoapify.com/v2/place-details?location=${encodeURIComponent(startLocation)}&apiKey=db92ad8d1db34be09380ec7803a9c8ed`;

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      const recommendedStops = document.getElementById('recommendedStops');
      recommendedStops.innerHTML = '';

      data.features.forEach(place => {
        const label = document.createElement('label');
        label.innerHTML = `
          <input type="checkbox" value="${place.properties.name}">
          <span class="text-checkbox">${place.properties.name}</span>
        `;
        recommendedStops.appendChild(label);
      });
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  }
}

// Ensure that the DOM is fully loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('addStop').addEventListener('click', function () {
    const extraStopsContainer = document.getElementById('extraStopsContainer');
    const stopContainer = document.createElement('div');
    stopContainer.classList.add('extra-stop-container');

    const stopInput = document.createElement('input');
    stopInput.setAttribute('type', 'text');
    stopInput.setAttribute('placeholder', `Extra Stop ${stopCount + 1}`);
    stopInput.classList.add('inputs');
    new google.maps.places.Autocomplete(stopInput);

    const durationSelect = document.createElement('select');
    durationSelect.classList.add('duration-selector');
    for (let i = 1; i <= 24; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = `${i} hr${i > 1 ? 's' : ''}`;
      durationSelect.appendChild(option);
    }

    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
    deleteButton.classList.add('delete-stop');
    deleteButton.addEventListener('click', function () {
      stopContainer.remove();
    });

    stopContainer.appendChild(stopInput);
    stopContainer.appendChild(durationSelect);
    stopContainer.appendChild(deleteButton);
    extraStopsContainer.appendChild(stopContainer);
    stopCount++;
  });

  document.getElementById('calculateFare').addEventListener('click', handleFareEstimation);

  document.getElementById('clearTrip').addEventListener('click', function () {
    directionsRenderer.set('directions', null);
    document.getElementById('fareOutput').innerText = '';
  });
});

// Function to calculate route with stops and duration
function handleFareEstimation() {
  const startLocation = document.getElementById('start').value;
  const destination = document.getElementById('destination').value;
  const startDuration = parseInt(document.getElementById('startDuration').value);
  const destinationDuration = parseInt(document.getElementById('destinationDuration').value);

  let waypoints = [];
  let totalStopDuration = startDuration + destinationDuration;

  const recommendedStops = document.querySelectorAll('#recommendedStops input[type="checkbox"]:checked');
  const extraStops = document.querySelectorAll('.extra-stop-container');

  recommendedStops.forEach(stop => {
    waypoints.push({ location: stop.value, stopover: true });
  });

  extraStops.forEach(stopContainer => {
    const stopInput = stopContainer.querySelector('input').value;
    const stopDuration = parseInt(stopContainer.querySelector('select').value);

    if (stopInput) {
      waypoints.push({ location: stopInput, stopover: true });
      totalStopDuration += stopDuration;
    }
  });

  if (startLocation && destination) {
    const request = {
      origin: startLocation,
      destination: destination,
      waypoints: waypoints,
      travelMode: 'DRIVING',
    };

    directionsService.route(request, function (result, status) {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);

        let totalDistance = 0;
        let totalDrivingTime = 0;
        result.routes[0].legs.forEach(leg => {
          totalDistance += leg.distance.value;
          totalDrivingTime += leg.duration.value;
        });

        const drivingHours = Math.floor(totalDrivingTime / 3600);
        const drivingMinutes = Math.floor((totalDrivingTime % 3600) / 60);

        const totalTripHours = drivingHours + totalStopDuration;
        document.getElementById('fareOutput').innerText = `Total Distance: ${(totalDistance / 1000).toFixed(2)} km \nTotal Driving Time: ${drivingHours} hrs ${drivingMinutes} mins \nTotal Trip Duration (with stops): ${totalTripHours} hrs ${drivingMinutes} mins`;
      } else {
        alert('Could not calculate route: ' + status);
      }
    });
  } else {
    alert('Please enter both starting location and destination.');
  }
}
const YELP_API_KEY = 'Your-Yelp-API-Key-Here';

// Function to fetch restaurants from Yelp API
async function fetchRestaurants() {
  const searchTerm = document.getElementById('restaurantSearch').value || 'restaurants';
  const restaurantFilter = document.getElementById('restaurantFilter').value;
  const userLocation = map.getCenter(); // Get the map's center for the current location

  const apiUrl = `https://api.yelp.com/v3/businesses/search?term=${searchTerm}&latitude=${userLocation.lat()}&longitude=${userLocation.lng()}&categories=${restaurantFilter}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${YELP_API_KEY}`,
      },
    });

    const data = await response.json();
    displayRestaurantResults(data.businesses);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
  }
}

// Display restaurant results
function displayRestaurantResults(businesses) {
  const restaurantsContainer = document.getElementById('extraStopsContainer');
  restaurantsContainer.innerHTML = ''; // Clear previous results

  businesses.forEach((business) => {
    const businessContainer = document.createElement('div');
    businessContainer.classList.add('restaurant-container');

    const restaurantName = document.createElement('h5');
    restaurantName.innerText = business.name;

    const rating = document.createElement('p');
    rating.innerText = `Rating: ${business.rating} (${business.review_count} reviews)`;

    const address = document.createElement('p');
    address.innerText = business.location.address1;

    const button = document.createElement('button');
    button.classList.add('uber-btn');
    button.innerText = 'Add as Stop';
    button.addEventListener('click', () => {
      addRestaurantAsStop(business);
    });

    businessContainer.appendChild(restaurantName);
    businessContainer.appendChild(rating);
    businessContainer.appendChild(address);
    businessContainer.appendChild(button);

    restaurantsContainer.appendChild(businessContainer);
  });
}

// Add restaurant as stop
function addRestaurantAsStop(business) {
  const extraStopsContainer = document.getElementById('extraStopsContainer');
  const stopContainer = document.createElement('div');
  stopContainer.classList.add('extra-stop-container');

  const stopInput = document.createElement('input');
  stopInput.setAttribute('type', 'text');
  stopInput.value = business.name;
  stopInput.classList.add('inputs');

  const durationSelect = document.createElement('select');
  durationSelect.classList.add('duration-selector');
  for (let i = 1; i <= 24; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `${i} hr${i > 1 ? 's' : ''}`;
    durationSelect.appendChild(option);
  }

  const deleteButton = document.createElement('button');
  deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
  deleteButton.classList.add('delete-stop');
  deleteButton.addEventListener('click', function () {
    stopContainer.remove();
  });

  stopContainer.appendChild(stopInput);
  stopContainer.appendChild(durationSelect);
  stopContainer.appendChild(deleteButton);
  extraStopsContainer.appendChild(stopContainer);
}

// Event listener for fetching restaurants
document.getElementById('searchRestaurant').addEventListener('click', fetchRestaurants);
