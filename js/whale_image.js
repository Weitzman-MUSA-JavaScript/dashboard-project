// Create function to update images
function updateImage(species) {
    const whaleImages = {
      humpbackWhale: [
        './data/humpbackWhale.jpg',
      ],
      whaleShark: [
        './data/whaleShark2.png',
      ],
      pilotWhale: [
        './data/pilotWhale.jpg',
      ],
      blueWhale: [
        './data/blueWhale.jpg',
      ],
      bowheadWhale: [
        './data/bowheadWhale.jpg',
      ],
      falseKillerWhale: [
        './data/falseKillerWhale.jpg',
      ],
      finWhale: [
        './data/finWhale.jpg',
      ],
      spermWhale: [
        './data/spermWhale.jpg',
      ],
    }

    const whaleImageContainer = document.getElementById('whaleImageContainer'); // A container for the images
    whaleImageContainer.innerHTML = ''; // Clear previous images

    const images = whaleImages[species];
    if (images) {
        images.forEach(src => {
            const img = document.createElement('img');
            img.src = src;
            img.alt = `${species} image`;
            img.style.width = '100%'; 
            img.style.marginBottom = '10px'; 
            whaleImageContainer.appendChild(img); 
        });
    }

  }

  export { updateImage }