'use strict';

function setActiveCell(id) { state.selectedCellId = id || null; }
function selectSingleCell(id) { interaction.selectedCellIds = id ? new Set([id]) : new Set(); setActiveCell(id); refreshCellClasses(); }
function addCellToSelection(id) { if (!id) return; interaction.selectedCellIds.add(id); setActiveCell(id); refreshCellClasses(); }
function removeCellFromSelection(id) { interaction.selectedCellIds.delete(id); const remaining = [...interaction.selectedCellIds]; setActiveCell(remaining.at(-1) || null); refreshCellClasses(); }
function describeSelection() { const count = interaction.selectedCellIds.size; return count ? `${count} cell${count === 1 ? '' : 's'} selected.` : 'No cells selected.'; }
function applyCellValue(id, type) { if (type === 'none') delete state.cells[id]; else state.cells[id] = { type }; }
function applyCellType(id) { const type = $('#cellType').val(); applyCellValue(id, type); invalidateInfluences(); setStatus(`${CELL_TYPES[type].label} applied to ${id}.`); }
function applyCellTypeToSelection() { const ids = [...interaction.selectedCellIds]; if (!ids.length) return setStatus('Select one or more cells first.'); const type = $('#cellType').val(); ids.forEach(id => applyCellValue(id, type)); invalidateInfluences(); renderMap(); setStatus(`${CELL_TYPES[type].label} applied to ${ids.length} selected cell${ids.length === 1 ? '' : 's'}.`); }

function swapCellContents(sourceId, targetId) {
  const source = state.cells[sourceId] ? { ...state.cells[sourceId] } : null;
  const target = state.cells[targetId] ? { ...state.cells[targetId] } : null;
  if (target) state.cells[sourceId] = target; else delete state.cells[sourceId];
  if (source) state.cells[targetId] = source; else delete state.cells[targetId];
  invalidateInfluences();
}

function selectedEdgeKeys(kind) {
  const selected = interaction.selectedCellIds;
  if (!selected.size) return [];
  const keys = new Set();
  selected.forEach(id => {
    const cell = parseCellId(id);
    DIRECTIONS.forEach(direction => {
      const neighbor = addAxial(cell, direction);
      const neighborId = cellId(neighbor.q, neighbor.r);
      if (!interaction.validCellIds.has(neighborId)) return;
      const neighborSelected = selected.has(neighborId);
      if ((kind === 'inside' && neighborSelected) || (kind === 'outside' && !neighborSelected)) keys.add(edgeKeyFromCells(cell, neighbor));
    });
  });
  return [...keys];
}

function applyEdgeTypeToSelection(kind) {
  if (!interaction.selectedCellIds.size) return setStatus('Select cells in Cell mode before applying batch edges.');
  const keys = selectedEdgeKeys(kind);
  if (!keys.length) return setStatus(`No ${kind} shared edges were found for the selection.`);
  const type = $('#edgeType').val();
  keys.forEach(key => { if (type === 'none') delete state.edges[key]; else state.edges[key] = { type }; });
  invalidateInfluences(); renderMap();
  const label = type === 'none' ? 'Cleared' : `Applied ${EDGE_TYPES[type].label} to`;
  setStatus(`${label} ${keys.length} ${kind} edge${keys.length === 1 ? '' : 's'}.`);
}

function svgPointFromClient(clientX, clientY) {
  const svg = $('#hexMap')[0];
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const point = svg.createSVGPoint(); point.x = clientX; point.y = clientY;
  return point.matrixTransform(matrix.inverse());
}

function roundAxial(q, r) {
  let x = q; let z = r; let y = -x - z;
  let rx = Math.round(x); let ry = Math.round(y); let rz = Math.round(z);
  const dx = Math.abs(rx - x); const dy = Math.abs(ry - y); const dz = Math.abs(rz - z);
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
  return { q: rx, r: rz };
}

function getCellIdAtClientPoint(clientX, clientY) {
  const point = svgPointFromClient(clientX, clientY); if (!point) return null;
  const rounded = roundAxial(((SQRT3 / 3) * point.x - point.y / 3) / HEX_SIZE, ((2 / 3) * point.y) / HEX_SIZE);
  const id = cellId(rounded.q, rounded.r);
  return interaction.validCellIds.has(id) ? id : null;
}

function onCellPointerDown(event, id) {
  if (interaction.mode !== 'cell' || event.button !== 0 || event.shiftKey) return;
  event.stopPropagation(); event.preventDefault();
  const ctrl = event.ctrlKey || event.metaKey;
  interaction.cellGesture = { pointerId: event.pointerId, sourceId: id, ctrl, startX: event.clientX, startY: event.clientY, moved: false, sourceWasSelected: interaction.selectedCellIds.has(id), visited: new Set([id]) };
  interaction.dragTargetCellId = null;
  if (ctrl) addCellToSelection(id);
  $('#hexMap')[0].setPointerCapture?.(event.pointerId);
}

function updateCellGesture(event) {
  const gesture = interaction.cellGesture; if (!gesture || gesture.pointerId !== event.pointerId) return;
  if (!gesture.moved && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >= 6) gesture.moved = true;
  if (!gesture.moved) return;
  const targetId = getCellIdAtClientPoint(event.clientX, event.clientY);
  if (gesture.ctrl) {
    if (targetId && !gesture.visited.has(targetId)) { gesture.visited.add(targetId); addCellToSelection(targetId); setStatus(describeSelection()); }
  } else {
    interaction.dragTargetCellId = targetId; refreshCellClasses();
    setStatus(targetId && targetId !== gesture.sourceId ? `Release to swap ${gesture.sourceId} with ${targetId}.` : 'Drag onto another cell to swap contents.');
  }
}

function finishCellGesture(event, cancelled = false) {
  const gesture = interaction.cellGesture; if (!gesture || gesture.pointerId !== event.pointerId) return;
  const targetId = getCellIdAtClientPoint(event.clientX, event.clientY);
  interaction.suppressNextCellClick = true; setTimeout(() => { interaction.suppressNextCellClick = false; }, 0);
  if (!cancelled && gesture.ctrl) {
    if (!gesture.moved && gesture.sourceWasSelected) removeCellFromSelection(gesture.sourceId); setStatus(describeSelection());
  } else if (!cancelled && gesture.moved && targetId && targetId !== gesture.sourceId) {
    swapCellContents(gesture.sourceId, targetId); interaction.cellGesture = null; interaction.dragTargetCellId = null; selectSingleCell(targetId); renderMap(); setStatus(`Swapped cell contents between ${gesture.sourceId} and ${targetId}.`); return;
  } else if (!cancelled && !gesture.moved) {
    selectSingleCell(gesture.sourceId); applyCellType(gesture.sourceId); interaction.cellGesture = null; renderMap(); return;
  } else setStatus(cancelled ? 'Cell gesture cancelled.' : 'Cell swap cancelled.');
  interaction.cellGesture = null; interaction.dragTargetCellId = null; refreshCellClasses();
}

function onCellClick(event, id) {
  event.stopPropagation();
  if (interaction.suppressNextCellClick) { interaction.suppressNextCellClick = false; return; }
  selectSingleCell(id); if (interaction.mode === 'cell') applyCellType(id); renderMap();
}

function onEdgeClick(event, key) {
  event.stopPropagation(); if (interaction.mode !== 'edge') return;
  const type = $('#edgeType').val();
  if (type === 'none') delete state.edges[key]; else state.edges[key] = { type };
  invalidateInfluences(); renderMap();
  setStatus(`${type === 'none' ? 'Edge cleared' : EDGE_TYPES[type].label + ' applied'}: ${key}.`);
}

function onPointClick(event, key) {
  event.stopPropagation(); if (interaction.mode !== 'point') return;
  const type = $('#pointType').val();
  if (type === 'none') delete state.points[key]; else state.points[key] = { type };
  renderMap();
  setStatus(`${type === 'none' ? 'Point cleared' : POINT_TYPES[type].label + ' applied'}.`);
}
