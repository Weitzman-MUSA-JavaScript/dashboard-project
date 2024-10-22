let gameInterval;
let gameRunning = false;
let score = 0; // Initialize the score

// Function to start the game
function startMiniGame() {
    if (gameRunning) return; // Prevent multiple instances
    gameRunning = true;

    // Reset the score
    score = 0;
    updateScoreDisplay();

    document.getElementById('score-counter').style.display = 'block';

    // Add event listener for the Esc key to exit game mode
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            stopMiniGame();
        }
    });

    // Start the game loop
    gameInterval = setInterval(() => {
        createRandomSVG();
    }, 1500);
}

// Function to stop the game
function stopMiniGame() {
    clearInterval(gameInterval); // Stop adding more SVGs
    document.querySelectorAll('.game-svg').forEach(svg => svg.remove()); // Remove all SVGs
    gameRunning = false;
    document.getElementById('score-counter').style.display = 'none';
}

// Function to create a randomly positioned SVG
function createRandomSVG() {
    const svg = document.createElement('div');
    svg.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="77" height="77" fill="currentColor" class="bi bi-house-fill" viewBox="0 0 16 16">
        <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L8 2.207l6.646 6.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293z"/>
        <path d="m8 3.293 6 6V13.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5V9.293z"/>
        </svg>
    `;
    svg.classList.add('game-svg'); // Add a class to identify the SVGs
    svg.style.position = 'absolute';
    svg.style.top = `${Math.random() * 90}vh`; // Randomize position
    svg.style.left = `${Math.random() * 90}vw`;

    // Add click event to remove SVG when clicked
    svg.addEventListener('click', function() {
        svg.remove();
        incrementScore(); // Increment score when clicked
    });

    // Append the SVG to the body
    document.body.appendChild(svg);
}

// Function to increment the score and update the display
function incrementScore() {
    score += 1;
    updateScoreDisplay();
}

// Function to update the score display in the top right corner
function updateScoreDisplay() {
    document.getElementById('score-counter').textContent = `Score: ${score}`;
}