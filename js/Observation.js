class Observation {

  constructor(district, area, realPrice, predPrice, lat, lon){
    this.district = district;
    this.area = area;
    this.realPrice = realPrice;
    this.predPrice = predPrice;
    this.residual = realPrice - predPrice;
    this.percentResidual = this.residual / this.realPrice;
    this.lat = lat;
    this.lon = lon;
  }
}

export {
  Observation,
};