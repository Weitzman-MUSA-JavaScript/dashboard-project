function setupMap() {
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    center: [-98, 38.88],
    maxZoom: 15,
    minZoom: 1,
    zoom: 3,
  });

  // 내비게이션 및 스케일 컨트롤 추가
  const nav = new mapboxgl.NavigationControl();
  map.addControl(nav, 'top-left');
  map.addControl(new mapboxgl.ScaleControl());

  return map;
}

export { setupMap };
