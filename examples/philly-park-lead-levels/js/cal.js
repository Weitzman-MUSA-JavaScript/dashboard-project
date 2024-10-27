/* globals turf */

function leadAnalysis(parkBuffer, leadSamples) {
  const featureSelection = turf.pointsWithinPolygon(leadSamples, parkBuffer);
  console.log(featureSelection.features.length);
  // test if the overlap is 0
  if (featureSelection.features.length == 0) {
    // use the closest lead point to assign the park lead level
    const parkCenter = turf.pointOnFeature(parkBuffer);
    const parkLeadRef = turf.nearestPoint(parkCenter, leadSamples);
    const parkLead = parkLeadRef.properties.Lead__ppm;
    return parkLead;
  } else {
    // calculate the average
    const leadArray = []; // since later use .push, can use count here
    for (let i = 0; i < featureSelection.features.length; i++) {
      const leadValue = featureSelection.features[i].properties.Lead__ppm;
      leadArray.push(leadValue); // .push is not a function, don't need to reassign
    }
    const parkLead = leadArray.reduce((partialSum, a) => (partialSum + a)/2, 0);
    return parkLead;
  }
}

export {
  leadAnalysis,
};
