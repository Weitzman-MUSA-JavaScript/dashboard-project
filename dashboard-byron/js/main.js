const projectCoordinates = {
    "Ang Mo Kio": [103.84515494925807, 1.3749890228765957],
    "Bedok 1": [103.94608866823155, 1.3142854046882988],
    "Bedok 2": [103.94623958879255, 1.3160236296175223],
    "Bedok 3": [103.91262169426813, 1.3228167899235626],
    "Bukit Batok": [103.73684050482362, 1.3549231649923992],
    "Geylang": [103.88026946399526, 1.3274615720494429],
    "Jurong West": [103.72633447850544, 1.3269696626372136],
    "Kallang Whampoa 1": [103.85789935268545, 1.3230457714217692],
    "Kallang Whampoa 2": [103.86413883505325, 1.3054341769958007],
    "Kallang Whampoa 3": [103.87295369391586, 1.317987651613951],
    "Pasir Ris 1": [103.94922500668866, 1.3769121070832524],
    "Pasir Ris 2": [103.95054451955161, 1.377151401249985],
    "Sengkang 1": [103.87919606616396, 1.3943307856805016],
    "Sengkang 2": [103.87612903093439, 1.4009138100721623],
    "Woodlands": [103.77255516423922, 1.4355446479153366]
};

function showContent(section) {
    if (section === 'explore') {
        showExploreContent();
    } else if (section === 'nature') {
        showNatureContent();
    } else if (section === 'transport') {
        showTransportContent();
    } else if (section === 'amenities') {
        showAmenitiesContent();
    } else if (section === 'compare') {
        showCompareContent();
    } else if (section === 'game') {
        startMiniGame();
    }

    map.flyTo({
        center: [103.809038, 1.353424],
        zoom: 10.5,
        essential: true // ensures smooth zooming experience
    });
}

function handleSectionChange(section, button) {
    const buttons = document.querySelectorAll('.sidebar .nav button');
    buttons.forEach(btn => {
        btn.classList.remove('btn-dark');
        btn.classList.add('btn-secondary');
    });
    button.classList.remove('btn-secondary');
    button.classList.add('btn-dark');

    if (section === 'compare') {
        showCompareContent();
    } else {
        resetLayout();
        // Call your existing showContent logic here for other sections
        showContent(section); 
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('.sidebar .nav button');

    buttons.forEach(button => {
        button.addEventListener('click', function() {
            const section = button.getAttribute('data-section');
            handleSectionChange(section, button);
        });
    });
});

let sitesData = null; // Global variable to hold GeoJSON data

// Function to load GeoJSON data
async function loadGeoJsonData() {
    const response = await fetch('assets/layers/sites_v6_ranked.geojson');
    if (response.ok) {
        sitesData = await response.json();
        console.log('Sites data loaded:', sitesData);
    } else {
        console.error('Failed to load GeoJSON data:', response.statusText);
    }
}

// Call the function to load GeoJSON data
loadGeoJsonData();

// Get the modal and close button
// Get modal and close button elements
const modal = document.getElementById('myModal');
const span = document.getElementsByClassName("close")[0];

// When the user clicks on the icon, open the modal with transition
document.getElementById('siteIcon').addEventListener('click', function() {
    modal.style.display = "block"; // Set display to block
    setTimeout(() => { // Delay adding the class to allow the display change
        modal.classList.add('show'); // Add show class to fade in
    }, 10); // Small timeout to trigger the transition
});

// When the user clicks on <span> (x), close the modal with transition
span.onclick = function() {
    modal.classList.remove('show'); // Remove show class to fade out
    modal.classList.add('hide'); // Add hide class for scale down effect
    setTimeout(() => { // Wait for transition to finish before hiding
        modal.style.display = "none";
        modal.classList.remove('hide'); // Reset hide class
    }, 300); // Match this duration with the CSS transition duration
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.classList.remove('show'); // Remove show class to fade out
        modal.classList.add('hide'); // Add hide class for scale down effect
        setTimeout(() => {
            modal.style.display = "none";
            modal.classList.remove('hide'); // Reset hide class
        }, 300); 
    }
}

// Function to check for mobile devices
function checkMobileDevice() {
    const width = window.innerWidth;

    // Check if the device is mobile (less than 768px for mobile, 768px to 1024px for tablets)
    if (width < 768) {
        alert("You are viewing this dashboard on mobile. Please use a laptop / desktop / VR browser instead. Good for your eyes.");
    }
}

// Run the check when the page loads
window.onload = checkMobileDevice;

// Function to handle mouse movement
function handleMouseMove(event) {
    // Get the viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate the center of the viewport
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;

    // Get the mouse position
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    // Calculate the angle based on the mouse position
    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;
    const angle = Math.atan2(deltaY, deltaX) * (45 / Math.PI) / 10; // Convert to degrees

    // Use GSAP to animate the rotation of the funIcon
    gsap.to("#funIcon", {
        rotation: angle,
        duration: 0.3,
        ease: "power1.out"
    });
}

// Attach mousemove event listener
window.addEventListener("mousemove", handleMouseMove);