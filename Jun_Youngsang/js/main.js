import { setupMap } from './map-setup.js';
import { setupGeocoder } from './geocoder.js';
import { addLayers } from './layers.js';

mapboxgl.accessToken = 'pk.eyJ1IjoieWptYXJrIiwiYSI6ImNtMHlwOG81NTBxZ2kya3BsZXp5MXJ5Z2wifQ.ijwd5rmGXOOJtSao2rNQhg';
const map = setupMap();

new mapboxgl.Popup({ closeOnClick: false })
  .setLngLat([-96, 62.8])
  .setHTML(`
    <h1>DefenseBoard</h1>
    <h2>About DefenseBoard</h2>
    <p>- DefenseBoard is a dashboard that uses spatial data to link various types of attributes in the defense sector such as military personnel, facilities, budget, logistics, etc. </p>
    <p>- The map on the right displays publicly accessible base locations across the United States, while on the left, users can view attribute data by base, military unit, or region.</p>
    <h2>Notes</h2>
    <p>- The DoD installations are commonly referred to as a base, camp, post, station, yard, center, homeport facility for any ship, or other activity under the jurisdiction, custody, control of the DoD. Publicly releasable locations of DoD Sites in the 50 states, Puerto Rico, and Guam available through data.gov.</p>
    <p>- This dataset was created from source data provided by the four Military Service Component headquarters and was compiled by the Defense Installation Spatial Data Infrastructure (DISDI) Program within the Office of the Deputy Under Secretary of Defense for Installations and Environment, Business Enterprise Integration Directorate. Sites were selected from the 2009 Base Structure Report (BSR), a summary of the DoD Real Property Inventory.</p>
    <p>- The military facility budgets per base for 2023-2025 used in DefenseBoard are fictitious and do not reflect actual data.</p>
    <h2>Reference</h2>
    <p>https://comptroller.defense.gov/Budget-Materials/Budget2025/#press</p>
`)
  .addTo(map);

// 레이어 그룹 토글 버튼 생성 함
function createGroupToggleButton(groupName, layerIds) {
  const container = document.getElementById('groupToggleContainer');
  const button = document.createElement('button');
  button.textContent = `View/hide ${groupName}`;
  button.onclick = () => toggleGroupVisibility(layerIds);
  button.classList.add('toggle-button');
  container.appendChild(button);
}

// 레이어 가시성 토글 함수
function toggleGroupVisibility(layerIds) {
  layerIds.forEach((layerId) => {
    const visibility = map.getLayoutProperty(layerId, 'visibility');

    // 현재 가시성 상태에 따라 토글
    if (visibility === 'visible' || visibility === undefined) {
      map.setLayoutProperty(layerId, 'visibility', 'none');
    } else {
      map.setLayoutProperty(layerId, 'visibility', 'visible');
    }
  });
}

// 초기 레이어 및 소스 추가
map.on('load', () => {
  addLayers(map);
});
setupGeocoder(map);

// 레이어 선택을 위한 버튼 설정
const layerList = document.getElementById('backgroundmap');
const inputs = layerList.getElementsByTagName('input');
for (const input of inputs) {
  input.onclick = (layer) => {
    const layerId = layer.target.id;
    map.setStyle('mapbox://styles/mapbox/' + layerId);
  };
}

// 레이어 토글 버튼 생성
createGroupToggleButton('Installations', ['base-borders', 'base-fills']);
createGroupToggleButton('FY2025 Installation Budget', ['clusters2025', 'unclustered-point', 'cluster-count2025']);
createGroupToggleButton('FY2024 Installation Budget', ['clusters2024', 'unclustered-point', 'cluster-count2024']);
createGroupToggleButton('FY2023 Installation Budget', ['clusters2023', 'unclustered-point', 'cluster-count2023']);

// 새로운 스타일 로드 시 레이어 복원
map.on('styledata', () => {
  if (!map.getSource('bases')) {
    addLayers(map); // 소스와 레이어가 없는 경우에만 추가
  }
});
