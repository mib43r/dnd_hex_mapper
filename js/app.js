$(function () {
  'use strict';

  function setActiveCell(id) {
    state.selectedCellId = id || null;
  }

  function selectSingleCell(id) {
    interaction.selectedCellIds = id ? new Set([id]) : new Set();
    setActiveCell(id);
    refreshCellClasses();
  }

  function addCellToSelection(id) {
    if (!id) return;
    interaction.selectedCellIds.add(id);
    setActiveCell(id);
    refreshCellClasses();
  }

  function removeCellFromSelection(id) {
    interaction.selectedCellIds.delete(id);
    const remaining = [...interaction.selectedCellIds];
    setActiveCell(remaining.at(-1) || null);
    refreshCellClasses();
  }

  function describeSelection() {
    const count = interaction.selectedCellIds.size;
    return count ? `${count} cell${count === 1 ? '' : 's'} selected.` : 'No cells selected.';
  }

  function applyCellValue(id, type) {
    if (type === 'none') delete state.cells[id];
    else state.cells[id] = { type };
  }

  function applyCellType(id) {
    const type = $('#cellType').val();
    applyCellValue(id, type);
    invalidateInfluences();
    setStatus(`${CELL_TYPES[type].label} applied to ${id}.`);
  }

  function applyCellTypeToSelection() {
    const ids = [...interaction.selectedCellIds];
    if (!ids.length) return setStatus('Select one or more cells first.');

    const type = $('#cellType').val();
    ids.forEach(id => applyCellValue(id, type));
    invalidateInfluences();
    renderMap();
    setStatus(`${CELL_TYPES[type].label} applied to ${ids.length} selected cell${ids.length === 1 ? '' : 's'}.`);
  }

  function swapCellContents(sourceId, targetId) {
    const source = state.cells[sourceId] ? { ...state.cells[sourceId] } : null;
    const target = state.cells[targetId] ? { ...state.cells[targetId] } : null;

    if (target) state.cells[sourceId] = target;
    else delete state.cells[sourceId];

    if (source) state.cells[targetId] = source;
    else delete state.cells[targetId];

    invalidateInfluences();
  }

  function selectedEdgeKeys(kind) {
    const selected = interaction.selectedCellIds;
    if (!selected.size) return [];

    const keys = new Set();
    selected.forEach(id => {
      const cell = parseCellId(id);
      DIRECTIONS.forEach(direction => {
        const neighborId = cellId(cell.q + direction.q, cell.r + direction.r);
        if (!interaction.validCellIds.has(neighborId)) return;

        const neighborSelected = selected.has(neighborId);
        if ((kind === 'inside' && neighborSelected) || (kind === 'outside' && !neighborSelected)) {
          keys.add(canonicalEdgeKey(id, neighborId));
        }
      });
    });

    return [...keys];
  }

  function applyEdgeTypeToSelection(kind) {
    if (!interaction.selectedCellIds.size) {
      return setStatus('Select cells in Cell mode before applying batch edges.');
    }

    const keys = selectedEdgeKeys(kind);
    if (!keys.length) return setStatus(`No ${kind} shared edges were found for the selection.`);

    const type = $('#edgeType').val();
    keys.forEach(key => {
      if (type === 'none') delete state.edges[key];
      else state.edges[key] = { type };
    });

    invalidateInfluences();
    renderMap();
    const label = type === 'none' ? 'Cleared' : `Applied ${EDGE_TYPES[type].label} to`;
    setStatus(`${label} ${keys.length} ${kind} edge${keys.length === 1 ? '' : 's'}.`);
  }

  function svgPointFromClient(clientX, clientY) {
    const svg = $('#hexMap')[0];
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;

    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    return point.matrixTransform(matrix.inverse());
  }

  function roundAxial(q, r) {
    let x = q;
    let z = r;
    let y = -x - z;
    let rx = Math.round(x);
    let ry = Math.round(y);
    let rz = Math.round(z);
    const dx = Math.abs(rx - x);
    const dy = Math.abs(ry - y);
    const dz = Math.abs(rz - z);

    if (dx > dy && dx > dz) rx = -ry - rz;
    else if (dy > dz) ry = -rx - rz;
    else rz = -rx - ry;

    return { q: rx, r: rz };
  }

  function getCellIdAtClientPoint(clientX, clientY) {
    const point = svgPointFromClient(clientX, clientY);
    if (!point) return null;

    const rounded = roundAxial(
      ((SQRT3 / 3) * point.x - point.y / 3) / HEX_SIZE,
      ((2 / 3) * point.y) / HEX_SIZE
    );
    const id = cellId(rounded.q, rounded.r);
    return interaction.validCellIds.has(id) ? id : null;
  }

  function onCellPointerDown(event, id) {
    if (interaction.mode !== 'cell' || event.button !== 0 || event.shiftKey) return;

    event.stopPropagation();
    event.preventDefault();
    const ctrl = event.ctrlKey || event.metaKey;
    interaction.cellGesture = {
      pointerId: event.pointerId,
      sourceId: id,
      ctrl,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      sourceWasSelected: interaction.selectedCellIds.has(id),
      visited: new Set([id])
    };
    interaction.dragTargetCellId = null;

    if (ctrl) addCellToSelection(id);
    $('#hexMap')[0].setPointerCapture?.(event.pointerId);
  }

  function updateCellGesture(event) {
    const gesture = interaction.cellGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    if (!gesture.moved && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >= 6) {
      gesture.moved = true;
    }
    if (!gesture.moved) return;

    const targetId = getCellIdAtClientPoint(event.clientX, event.clientY);
    if (gesture.ctrl) {
      if (targetId && !gesture.visited.has(targetId)) {
        gesture.visited.add(targetId);
        addCellToSelection(targetId);
        setStatus(describeSelection());
      }
    } else {
      interaction.dragTargetCellId = targetId;
      refreshCellClasses();
      setStatus(
        targetId && targetId !== gesture.sourceId
          ? `Release to swap ${gesture.sourceId} with ${targetId}.`
          : 'Drag onto another cell to swap contents.'
      );
    }
  }

  function finishCellGesture(event, cancelled = false) {
    const gesture = interaction.cellGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const targetId = getCellIdAtClientPoint(event.clientX, event.clientY);
    interaction.suppressNextCellClick = true;
    setTimeout(() => {
      interaction.suppressNextCellClick = false;
    }, 0);

    if (!cancelled && gesture.ctrl) {
      if (!gesture.moved && gesture.sourceWasSelected) removeCellFromSelection(gesture.sourceId);
      setStatus(describeSelection());
    } else if (!cancelled && gesture.moved && targetId && targetId !== gesture.sourceId) {
      swapCellContents(gesture.sourceId, targetId);
      interaction.cellGesture = null;
      interaction.dragTargetCellId = null;
      selectSingleCell(targetId);
      renderMap();
      setStatus(`Swapped cell contents between ${gesture.sourceId} and ${targetId}.`);
      return;
    } else if (!cancelled && !gesture.moved) {
      selectSingleCell(gesture.sourceId);
      applyCellType(gesture.sourceId);
      interaction.cellGesture = null;
      renderMap();
      return;
    } else {
      setStatus(cancelled ? 'Cell gesture cancelled.' : 'Cell swap cancelled.');
    }

    interaction.cellGesture = null;
    interaction.dragTargetCellId = null;
    refreshCellClasses();
  }

  function onCellClick(event, id) {
    event.stopPropagation();
    if (interaction.suppressNextCellClick) {
      interaction.suppressNextCellClick = false;
      return;
    }

    selectSingleCell(id);
    if (interaction.mode === 'cell') applyCellType(id);
    renderMap();
  }

  function onEdgeClick(event, key) {
    event.stopPropagation();
    if (interaction.mode !== 'edge') return;

    const type = $('#edgeType').val();
    if (type === 'none') delete state.edges[key];
    else state.edges[key] = { type };

    invalidateInfluences();
    renderMap();
    setStatus(`${type === 'none' ? 'Edge cleared' : EDGE_TYPES[type].label + ' applied'}: ${key}.`);
  }

  function onPointClick(event, key, vertex) {
    event.stopPropagation();
    if (interaction.mode !== 'point') return;

    const type = $('#pointType').val();
    if (type === 'none') {
      delete state.points[key];
    } else {
      state.points[key] = {
        type,
        x: vertex.x,
        y: vertex.y,
        adjacentCellIds: vertex.adjacentCellIds.slice(0, 3)
      };
    }

    renderMap();
    setStatus(`${type === 'none' ? 'Point cleared' : POINT_TYPES[type].label + ' applied'}.`);
  }

  function movementCost(fromId, toId) {
    const edge = state.edges[canonicalEdgeKey(fromId, toId)]?.type || null;
    const fromType = getExistingCellType(fromId);
    const toType = getExistingCellType(toId);

    if (edge === 'river') return Infinity;
    if (toType === 'water' || fromType === 'water') return edge === 'bridge' ? 1 : Infinity;
    if (toType === 'mountains' || fromType === 'mountains') return edge === 'pass' ? 1 : Infinity;
    if (edge === 'road') return 0.5;
    if (edge === 'bridge' || edge === 'pass') return 1;
    return CELL_TYPES[toType].cost;
  }

  function calculateMultiSourceReach(originIds, budget, validIds) {
    const costs = {};
    const heap = new MinHeap();

    originIds.forEach(id => {
      costs[id] = 0;
      heap.push({ id, cost: 0 });
    });

    while (heap.length) {
      const current = heap.pop();
      if (!current || current.cost !== costs[current.id] || current.cost > budget) continue;

      const cell = parseCellId(current.id);
      DIRECTIONS.forEach(direction => {
        const neighborId = cellId(cell.q + direction.q, cell.r + direction.r);
        if (!validIds.has(neighborId)) return;

        const step = movementCost(current.id, neighborId);
        if (!Number.isFinite(step)) return;

        const candidate = current.cost + step;
        if (candidate <= budget && (costs[neighborId] === undefined || candidate < costs[neighborId])) {
          costs[neighborId] = candidate;
          heap.push({ id: neighborId, cost: candidate });
        }
      });
    }

    return costs;
  }

  function calculateAllInfluences() {
    const budget = Number($('#travelBudget').val());
    if (!Number.isFinite(budget) || budget <= 0) {
      setStatus('Travel budget must be greater than zero.');
      return false;
    }

    const validIds = new Set(generateSpiral(state.cellCount).map(cell => cellId(cell.q, cell.r)));
    state.influences.budget = budget;
    const sourceCounts = {};

    INFLUENCE_TYPES.forEach(type => {
      const sources = Object.keys(state.cells).filter(id => validIds.has(id) && state.cells[id].type === type);
      sourceCounts[type] = sources.length;
      state.influences.costs[type] = calculateMultiSourceReach(sources, budget, validIds);
    });

    state.influences.calculated = true;
    updateInfluenceSummary(sourceCounts);
    return true;
  }

  function updateInfluenceSummary(sourceCounts = null) {
    if (!state.influences.calculated) {
      $('#influenceSummary').text('No influence calculation yet.');
      return;
    }

    const counts = sourceCounts || Object.fromEntries(
      INFLUENCE_TYPES.map(type => [
        type,
        Object.values(state.cells).filter(cell => cell.type === type).length
      ])
    );
    $('#influenceSummary').text(`Sources — forest: ${counts.forest}, grain: ${counts.grain}, city: ${counts.city}.`);
  }

  function syncInfluenceControls() {
    $('#travelBudget').val(state.influences.budget);
    INFLUENCE_TYPES.forEach(type => {
      $(`.influence-toggle[data-influence-type="${type}"]`).prop('checked', state.influences.enabled[type]);
    });
    updateInfluenceSummary();
  }

  function setStatus(message) {
    $('#statusText').text(message);
  }

  function updateStatus() {
    updateInfluenceSummary();
  }

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

  $('#exportJson').on('click', function () {
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
  });

  $('#importJson').on('click', function () {
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
  });

  $('#copyJson').on('click', async function () {
    if (!$('#jsonState').val()) $('#exportJson').trigger('click');

    try {
      await navigator.clipboard.writeText($('#jsonState').val());
    } catch {
      $('#jsonState').trigger('select');
      document.execCommand('copy');
    }

    setStatus('JSON copied to clipboard.');
  });

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
