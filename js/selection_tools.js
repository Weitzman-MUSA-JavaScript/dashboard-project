export function initSelectionTools() {
  const countElement = document.getElementById('selected-count');
  const clearBtn = document.getElementById('clear-selection');
  const exportBtn = document.getElementById('export-selection');

  function updateCount() {
    if (!window.mapLayers || !countElement) return;
    const count = window.mapLayers.selectedLayers.size || 0;
    countElement.textContent = count;

    if (exportBtn) exportBtn.disabled = count === 0;
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!window.mapLayers) return;

      window.mapLayers.selectedLayers.forEach((layer) => {
        if (layer._path) L.DomUtil.removeClass(layer._path, 'hex-selected');
        if (layer.unbindTooltip) layer.unbindTooltip();
      });
      window.mapLayers.selectedLayers.clear();

      if (window.pieChartControls && typeof window.pieChartControls.clearSelection === 'function') {
        window.pieChartControls.clearSelection();
      }

      updateCount();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (!window.mapLayers || window.mapLayers.selectedLayers.size === 0) {
        alert('No hexagons selected!');
        return;
      }

      const features = Array.from(window.mapLayers.selectedLayers, (l) => l.feature);

      const geojson = {
        type: 'FeatureCollection',
        features: features,
      };

      const dataStr = JSON.stringify(geojson, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `selected_hexagons_${new Date().toISOString().slice(0, 10)}.geojson`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }

  updateCount();

  if (!window.updateSelectionCount) {
    window.updateSelectionCount = updateCount;
  }

  return { updateCount };
}
