'use strict';

function exportMapState() {
  const exported = {
    schemaVersion: state.schemaVersion,
    cellCount: state.cellCount,
    cells: state.cells,
    edges: state.edges,
    points: state.points,
    selectedCellId: state.selectedCellId,
    influences: {
      budget: Number($('#travelBudget').val()) || state.influences.budget,
      enabled: state.influences.enabled,
      calculated: state.influences.calculated
    }
  };

  $('#jsonState').val(JSON.stringify(exported, null, 2));
  setStatus('Map exported to JSON.');
}

function importMapState() {
  try {
    state = sanitizeState(JSON.parse($('#jsonState').val()));
    interaction.selectedCellIds = state.selectedCellId ? new Set([state.selectedCellId]) : new Set();
    $('#cellCount').val(state.cellCount);
    syncInfluenceControls();
    if (state.influences.calculated) calculateAllInfluences();
    renderMap({ fit: true });
    setStatus('Map restored from JSON.');
  } catch (error) {
    setStatus(`Import failed: ${error.message}`);
  }
}

async function copyMapJson() {
  if (!$('#jsonState').val()) exportMapState();

  try {
    await navigator.clipboard.writeText($('#jsonState').val());
  } catch {
    $('#jsonState').trigger('select');
    document.execCommand('copy');
  }

  setStatus('JSON copied to clipboard.');
}
