'use strict';

let state = createInitialState(61);

const interaction = {
  mode: 'cell',
  zoom: 1,
  panX: 0,
  panY: 0,
  panning: false,
  panStart: null,
  baseViewBox: null,
  validCellIds: new Set(),
  selectedCellIds: new Set(),
  cellGesture: null,
  dragTargetCellId: null,
  suppressNextCellClick: false
};

function createInitialState(cellCount) {
  return {
    schemaVersion: 2,
    cellCount: clampCellCount(cellCount),
    cells: {},
    edges: {},
    points: {},
    selectedCellId: null,
    influences: {
      budget: 3,
      enabled: { forest: true, grain: true, city: true },
      calculated: false,
      costs: { forest: {}, grain: {}, city: {} }
    }
  };
}

function clampCellCount(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(MAX_CELLS, parsed)) : 1;
}

function invalidateInfluences() {
  state.influences.costs = { forest: {}, grain: {}, city: {} };
  state.influences.calculated = false;
}

function sanitizeState(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('JSON must contain an object.');

  const clean = createInitialState(raw.cellCount || 1);
  const validIds = new Set(generateSpiral(clean.cellCount).map(cell => cellId(cell.q, cell.r)));

  Object.entries(raw.cells || {}).forEach(([id, value]) => {
    if (validIds.has(id) && value && CELL_TYPES[value.type] && value.type !== 'none') {
      clean.cells[id] = { type: value.type };
    }
  });

  Object.entries(raw.edges || {}).forEach(([key, value]) => {
    const ids = key.split('|');
    if (ids.length === 2 && ids.every(id => validIds.has(id)) && value && EDGE_TYPES[value.type]) {
      clean.edges[canonicalEdgeKey(ids[0], ids[1])] = { type: value.type };
    }
  });

  Object.entries(raw.points || {}).forEach(([key, value]) => {
    if (value && POINT_TYPES[value.type] && Number.isFinite(value.x) && Number.isFinite(value.y)) {
      clean.points[key] = {
        type: value.type,
        x: value.x,
        y: value.y,
        adjacentCellIds: (value.adjacentCellIds || []).filter(id => validIds.has(id)).slice(0, 3)
      };
    }
  });

  if (validIds.has(raw.selectedCellId)) clean.selectedCellId = raw.selectedCellId;

  const budget = Number(raw.influences?.budget ?? raw.overlay?.budget);
  clean.influences.budget = Number.isFinite(budget) && budget > 0 ? budget : 3;

  INFLUENCE_TYPES.forEach(type => {
    if (typeof raw.influences?.enabled?.[type] === 'boolean') {
      clean.influences.enabled[type] = raw.influences.enabled[type];
    }
  });

  clean.influences.calculated = Boolean(raw.influences?.calculated);
  return clean;
}

function rebuildPreservingData(newCount) {
  const old = state;
  const next = createInitialState(newCount);
  const validIds = new Set(generateSpiral(next.cellCount).map(cell => cellId(cell.q, cell.r)));

  Object.entries(old.cells).forEach(([id, value]) => {
    if (validIds.has(id)) next.cells[id] = value;
  });

  Object.entries(old.edges).forEach(([key, value]) => {
    if (key.split('|').every(id => validIds.has(id))) next.edges[key] = value;
  });

  Object.entries(old.points).forEach(([key, value]) => {
    const adjacent = (value.adjacentCellIds || []).filter(id => validIds.has(id));
    if (adjacent.length) next.points[key] = { ...value, adjacentCellIds: adjacent };
  });

  if (validIds.has(old.selectedCellId)) next.selectedCellId = old.selectedCellId;

  next.influences.budget = old.influences.budget;
  next.influences.enabled = { ...old.influences.enabled };
  state = next;
}
