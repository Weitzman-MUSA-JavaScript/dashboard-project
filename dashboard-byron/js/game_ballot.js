function startMiniGame() {
    // Set all map properties to 0
    map.setPaintProperty('Sites_v6', 'fill-opacity', 0);
    map.setPaintProperty('MRTLines_20240914', 'line-opacity', 0);
    map.setPaintProperty('MRTStations_20240914_v1', 'text-opacity', 0);
    map.setPaintProperty('HawkerCentres', 'circle-opacity', 0);
    map.setPaintProperty('HawkerCentres', 'circle-stroke-opacity', 0);
    map.setPaintProperty('PublicLibraries', 'circle-opacity', 0);
    map.setPaintProperty('PublicLibraries', 'circle-stroke-opacity', 0);
    map.setPaintProperty('Parks', 'fill-opacity', 0);
    map.setPaintProperty('ExistingHDBDissolved', 'fill-opacity', 0);

    // Get the content panel and map panel elements
    let contentPanel = document.getElementById('description-panel');
    
    // Update the content panel with mini game content
    contentPanel.innerHTML = `
        <div style="text-align: center; font-family: 'Barlow', sans-serif; padding: 20px;">
            <div style="display: inline-block; padding: 10px; font-size: 2.5em; font-weight: bold; color: black; animation: rainbow 12s linear infinite;">
                THE BTO LOTTERY
            </div>
            <h3 style="font-size: 2em;">Try your luck at balloting<br>for a BTO!</h3>
            <button id="ballot-button" class="btn" style="margin-top: 10px; background-color: #ded9ca; border: none; color: #333;">Ballot!</button>
            <p><br>Outcome:</p>
            <p id="result"></p>
            <p id="attempts">You have tried: 0 times</p>
        </div>
        <style>
            @keyframes rainbow {
                0% { background-color: orange; }
                25% { background-color: yellow; }
                50% { background-color: #00f100; }
                75% { background-color: yellow; }
                100% { background-color: orange; }
            }
        </style>
    `;

    // Initialize jsConfetti and set up event listener
    const jsConfetti = new JSConfetti(); // Initialize jsConfetti
    let clickCount = 0;

    // Handle ballot button click
    document.getElementById('ballot-button').addEventListener('click', function() {
        clickCount++;
        const randomChance = Math.random(); // Generates a number between 0 and 1
        const resultText = randomChance < 0.3 ? "Congrats! Your ballot is successful!<br>Enjoy your married life! And your 99-year lease!" : "Your ballot is NOT successful!<br>There goes your $10!";
        document.getElementById('result').innerHTML = resultText;
        document.getElementById('attempts').innerHTML = "You have tried: " + clickCount + " times";

        // If the ballot is successful, trigger confetti
        if (randomChance < 0.4) {
            jsConfetti.addConfetti({
                emojis: ['🚻', '🏠', '🍆', '💫'],
                emojiSize: 40,
            });
        }
    });
}