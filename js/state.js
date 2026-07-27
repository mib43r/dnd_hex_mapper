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

const INFLUENCE_TERRAIN_TYPES = ['plains', 'forest', 'desert', 'grain', 'city'];

function createDefaultInfluenceSettings() {
  return Object.fromEntries(INFLUENCE_TYPES.map(type => [
    type,
    {
      budget: 3,
      terrainMultipliers: {
        plains: 1,
        forest: 2,
        desert: 1,
        grain: 1,
        city: 1
      }
    }
  ]));
}

function createInitialState(cellCount) {
  return {
    schemaVersion: 3,
    cellCount: clampCellCount(cellCount),
    cells: {},
    edges: {},
    points: {},
    selectedCellId: null,
    influences: {
      enabled: { forest: true, grain: true, city: true },
      settings: createDefaultInfluenceSettings(),
      calculated: false,
      costs: { forest: {}, grain: {}, city: {} }
    }
  };
}

function clampCellCount(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(MAX_CELLS, parsed)) : 1;
}

function sanitizePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

  const legacyBudget = sanitizePositiveNumber(raw.influences?.budget ?? raw.overlay?.budget, 3);

  INFLUENCE_TYPES.forEach(type => {
    if (typeof raw.influences?.enabled?.[type] === 'boolean') {
      clean.influences.enabled[type] = raw.influences.enabled[type];
    }

    const rawSettings = raw.influences?.settings?.[type] || {};
    clean.influences.settings[type].budget = sanitizePositiveNumber(rawSettings.budget, legacyBudget);

    INFLUENCE_TERRAIN_TYPES.forEach(terrainType => {
      clean.influences.settings[type].terrainMultipliers[terrainType] = sanitizePositiveNumber(
        rawSettings.terrainMultipliers?.[terrainType],
        clean.influences.settings[type].terrainMultipliers[terrainType]
      );
    });
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

  next.influences.enabled = { ...old.influences.enabled };
  next.influences.settings = JSON.parse(JSON.stringify(old.influences.settings));
  state = next;
}
