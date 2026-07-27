$(function () {
  'use strict';

  function setStatus(message) {
    $('#statusText').text(message);
  }

  window.setStatus = setStatus;

  window.updateStatus = function updateStatus() {
    updateInfluenceSummary();
  };

  function refreshToolPanels() {
    $('.tool-panel').addClass('d-none');
    $(`#${interaction.mode}ToolPanel`).removeClass('d-none');
    $('.mode-button').removeClass('active');
    $(`.mode-button[data-mode="${interaction.mode}"]`).addClass('active');

    const messages = {
      cell: 'Cell mode: paint, Ctrl-select, batch-fill, or drag to swap.',
      edge: 'Edge mode: click one edge or batch-fill selected inside/outside edges.',
      point: 'Point mode: click a corner.'
    };
    setStatus(messages[interaction.mode]);
    renderMap();
  }

  $('.mode-button').on('click', function () {
    interaction.mode = $(this).data('mode');
    refreshToolPanels();
  });

  $('#applyCellsToSelection').on('click', applyCellTypeToSelection);
  $('#applyOutsideEdges').on('click', () => applyEdgeTypeToSelection('outside'));
  $('#applyInsideEdges').on('click', () => applyEdgeTypeToSelection('inside'));

  $('#rebuildMap').on('click', function () {
    const count = clampCellCount($('#cellCount').val());
    $('#cellCount').val(count);
    rebuildPreservingData(count);
    interaction.selectedCellIds = state.selectedCellId ? new Set([state.selectedCellId]) : new Set();
    renderMap({ fit: true });
    setStatus(`Map rebuilt with ${count} cells.`);
  });

  $('#calculateInfluences').on('click', function () {
    if (!calculateAllInfluences()) return;
    renderMap();
    const total = INFLUENCE_TYPES.reduce(
      (sum, type) => sum + Object.keys(state.influences.costs[type]).length,
      0
    );
    setStatus(`Calculated forest, grain, and city influence for ${total} type-cell reaches.`);
  });

  $('#clearInfluences').on('click', function () {
    invalidateInfluences();
    renderMap();
    setStatus('Influence overlays cleared.');
  });

  $('.influence-toggle').on('change', function () {
    const type = $(this).data('influence-type');
    state.influences.enabled[type] = this.checked;
    renderMap();
    setStatus(`${CELL_TYPES[type].label} influence ${this.checked ? 'shown' : 'hidden'}.`);
  });

  $('.influence-setting').on('change', function () {
    if (!updateInfluenceSettingsFromControls()) {
      setStatus('Influence budgets and terrain multipliers must be greater than zero.');
      return;
    }

    invalidateInfluences();
    renderMap();
    setStatus('Influence settings changed. Recalculate to update the overlays.');
  });

  $('#exportJson').on('click', exportMapState);
  $('#importJson').on('click', importMapState);
  $('#copyJson').on('click', copyMapJson);

  $('#zoomIn').on('click', () => {
    interaction.zoom = Math.min(6, interaction.zoom * 1.25);
    applyViewBox();
  });

  $('#zoomOut').on('click', () => {
    interaction.zoom = Math.max(0.5, interaction.zoom / 1.25);
    applyViewBox();
  });

  $('#fitMap').on('click', () => {
    interaction.zoom = 1;
    interaction.panX = 0;
    interaction.panY = 0;
    applyViewBox();
  });

  $('#hexMap').on('wheel', function (event) {
    event.preventDefault();
    interaction.zoom = Math.max(
      0.5,
      Math.min(6, interaction.zoom * (event.originalEvent.deltaY < 0 ? 1.12 : 0.89))
    );
    applyViewBox();
  });

  $('#hexMap').on('pointerdown', function (event) {
    if (event.button !== 1 && !(event.button === 0 && event.shiftKey)) return;
    interaction.panning = true;
    interaction.panStart = {
      x: event.clientX,
      y: event.clientY,
      panX: interaction.panX,
      panY: interaction.panY
    };
    this.setPointerCapture(event.pointerId);
  });

  $('#hexMap').on('pointermove', function (event) {
    if (interaction.panning && interaction.baseViewBox) {
      const rect = this.getBoundingClientRect();
      const scaleX = (interaction.baseViewBox.width / interaction.zoom) / rect.width;
      const scaleY = (interaction.baseViewBox.height / interaction.zoom) / rect.height;
      interaction.panX = interaction.panStart.panX - (event.clientX - interaction.panStart.x) * scaleX;
      interaction.panY = interaction.panStart.panY - (event.clientY - interaction.panStart.y) * scaleY;
      applyViewBox();
      return;
    }

    updateCellGesture(event);
  });

  $('#hexMap').on('pointerup', function (event) {
    interaction.panning = false;
    finishCellGesture(event);
    if (this.hasPointerCapture?.(event.pointerId)) this.releasePointerCapture(event.pointerId);
  });

  $('#hexMap').on('pointercancel', function (event) {
    interaction.panning = false;
    finishCellGesture(event, true);
    if (this.hasPointerCapture?.(event.pointerId)) this.releasePointerCapture(event.pointerId);
  });

  renderLegend();
  syncInfluenceControls();
  renderMap({ fit: true });
  refreshToolPanels();
});
