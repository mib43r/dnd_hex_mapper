'use strict';

function groupFeaturesByType(features, coordinateFromKey) {
  const grouped = {};
  Object.entries(features).forEach(([key, value]) => {
    if (!value?.type || value.type === 'none' || value.type === 'plains') return;
    grouped[value.type] ||= [];
    grouped[value.type].push(coordinateFromKey(key));
  });
  return grouped;
}

function exportMapState() {
  pruneInvalidMapFeatures();

  const exported = {
    schemaVersion: 4,
    coordinateSystem: 'scaled-axial-v1',
    cellCount: state.cellCount,
    cells: groupFeaturesByType(state.cells, id => {
      const cell = parseCellId(id);
      return [cell.q, cell.r];
    }),
    edges: groupFeaturesByType(state.edges, parseCoordinateKey),
    points: groupFeaturesByType(state.points, parseCoordinateKey)
  };

  $('#jsonState').val(JSON.stringify(exported, null, 2));
  setStatus('Map exported to compact JSON.');
}

function importMapState() {
  try {
    state = sanitizeState(JSON.parse($('#jsonState').val()));
    interaction.selectedCellIds = new Set();
    $('#cellCount').val(state.cellCount);
    syncInfluenceControls();
    calculateAllInfluences();
    renderMap({ fit: true });
    setStatus('Map restored from JSON.');
  } catch (error) {
    setStatus(`Import failed: ${error.message}`);
  }
}

async function copyMapJson() {
  if (!$('#jsonState').val()) exportMapState();
  if (!$('#jsonState').val()) return;

  try {
    await navigator.clipboard.writeText($('#jsonState').val());
  } catch {
    $('#jsonState').trigger('select');
    document.execCommand('copy');
  }

  setStatus('JSON copied to clipboard.');
}
