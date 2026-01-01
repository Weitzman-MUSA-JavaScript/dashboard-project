  // Create function for updating status indicator
  function updateWhaleStatus(species) {
    const whaleSpecies = [
      { name: "humpbackWhale", iucnStatus: "LC" },
      { name: "whaleShark", iucnStatus: "NT" },
      { name: "pilotWhale", iucnStatus: "VU" },
      { name: "blueWhale", iucnStatus: "CR" },
      { name: "bowheadWhale", iucnStatus: "LC" },
      { name: "falseKillerWhale", iucnStatus: "EN" },
      { name: "finWhale", iucnStatus: "LC" },
      { name: "spermWhale", iucnStatus: "LC" }
    ];
    
    const iucnDescriptions = {
    "LC": { text: "Least Concern", color: "lightgreen" },
    "NT": { text: "Near Threatened", color: "yellow" },
    "VU": { text: "Vulnerable", color: "orange" },
    "EN": { text: "Endangered", color: "#f15757" },
    "CR": { text: "Critically Endangered", color: "red" },
    "EW": { text: "Extinct in the Wild", color: "gray" },
    "EX": { text: "Extinct", color: "black" }
    };

    const speciesName = whaleSpecies.find(s => s.name === species);
    if (!speciesName) {
      console.error('Species not found:', species);
      return;
  }

  const statusInfo = iucnDescriptions[speciesName.iucnStatus];
  if (statusInfo) {

      const statusElement = document.querySelector('.statusText');
        statusElement.innerText = statusInfo.text;
        statusElement.style.color = statusInfo.color;

  } else {
      console.error('Status information not found for:', speciesName.iucnStatus);
  }
}

export { updateWhaleStatus }