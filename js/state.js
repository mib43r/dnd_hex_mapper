'use strict';

let state = createInitialState(61);

const interaction = {
  mode: 'cell', zoom: 1, panX: 0, panY: 0, panning: false, panStart: null, baseViewBox: null,
  validCellIds: new Set(), selectedCellIds: new Set(), cellGesture: null, dragTargetCellId: null,
  suppressNextCellClick: false
};

const INFLUENCE_TERRAIN_TYPES = ['plains', 'forest', 'desert', 'grain', 'city'];

function createDefaultInfluenceSettings() {
  return Object.fromEntries(INFLUENCE_TYPES.map(type => [type, {
    budget: 3,
    terrainMultipliers: { plains: 1, forest: 2, desert: 1, grain: 1, city: 1 }
  }]));
}

function createInitialState(cellCount) {
  return {
    schemaVersion: 4,
    cellCount: clampCellCount(cellCount),
    cells: {}, edges: {}, points: {}, selectedCellId: null,
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

function isCoordinate(value) {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isInteger);
}

function validCellIdSet(cellCount = state.cellCount) {
  return new Set(generateSpiral(cellCount).map(cell => cellId(cell.q, cell.r)));
}

function pruneInvalidMapFeatures(target = state) {
  const validIds = validCellIdSet(target.cellCount);

  Object.keys(target.cells).forEach(id => { if (!validIds.has(id)) delete target.cells[id]; });
  Object.keys(target.edges).forEach(key => {
    const incident = edgeCells(parseCoordinateKey(key));
    if (!incident.some(cell => validIds.has(cellId(cell.q, cell.r)))) delete target.edges[key];
  });
  Object.keys(target.points).forEach(key => {
    const incident = pointCells(parseCoordinateKey(key));
    if (!incident.some(cell => validIds.has(cellId(cell.q, cell.r)))) delete target.points[key];
  });

  if (!validIds.has(target.selectedCellId)) target.selectedCellId = null;
  target.influences.costs = { forest: {}, grain: {}, city: {} };
  target.influences.calculated = false;
  return target;
}

function importGroupedFeatures(raw, clean) {
  Object.entries(raw.cells || {}).forEach(([type, coordinates]) => {
    if (!CELL_TYPES[type] || type === 'none' || type === 'plains' || !Array.isArray(coordinates)) return;
    coordinates.filter(isCoordinate).forEach(([q, r]) => { clean.cells[cellId(q, r)] = { type }; });
  });
  Object.entries(raw.edges || {}).forEach(([type, coordinates]) => {
    if (!EDGE_TYPES[type] || type === 'none' || !Array.isArray(coordinates)) return;
    coordinates.filter(isCoordinate).forEach(coordinate => { clean.edges[coordinateKey(coordinate)] = { type }; });
  });
  Object.entries(raw.points || {}).forEach(([type, coordinates]) => {
    if (!POINT_TYPES[type] || type === 'none' || !Array.isArray(coordinates)) return;
    coordinates.filter(isCoordinate).forEach(coordinate => { clean.points[coordinateKey(coordinate)] = { type }; });
  });
}

function importLegacyFeatures(raw, clean, validIds) {
  Object.entries(raw.cells || {}).forEach(([id, value]) => {
    if (validIds.has(id) && value && CELL_TYPES[value.type] && value.type !== 'none' && value.type !== 'plains') clean.cells[id] = { type: value.type };
  });
  Object.entries(raw.edges || {}).forEach(([key, value]) => {
    const ids = key.split('|');
    if (ids.length !== 2 || !ids.every(id => validIds.has(id)) || !value || !EDGE_TYPES[value.type]) return;
    const [a, b] = ids.map(parseCellId);
    clean.edges[edgeKeyFromCells(a, b)] = { type: value.type };
  });
  Object.values(raw.points || {}).forEach(value => {
    if (!value || !POINT_TYPES[value.type]) return;
    const adjacent = (value.adjacentCellIds || []).filter(id => validIds.has(id)).map(parseCellId);
    if (adjacent.length === 3) clean.points[coordinateKey(pointCoordinate(...adjacent))] = { type: value.type };
  });
}

function sanitizeState(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('JSON must contain an object.');
  const clean = createInitialState(raw.cellCount || 1);
  const validIds = validCellIdSet(clean.cellCount);

  if (Number(raw.schemaVersion) >= 4 && raw.coordinateSystem === 'scaled-axial-v1') importGroupedFeatures(raw, clean);
  else importLegacyFeatures(raw, clean, validIds);

  const legacyBudget = sanitizePositiveNumber(raw.influences?.budget ?? raw.overlay?.budget, 3);
  INFLUENCE_TYPES.forEach(type => {
    const rawSettings = raw.influences?.settings?.[type] || {};
    clean.influences.settings[type].budget = sanitizePositiveNumber(rawSettings.budget, legacyBudget);
    INFLUENCE_TERRAIN_TYPES.forEach(terrainType => {
      clean.influences.settings[type].terrainMultipliers[terrainType] = sanitizePositiveNumber(
        rawSettings.terrainMultipliers?.[terrainType], clean.influences.settings[type].terrainMultipliers[terrainType]
      );
    });
  });

  return pruneInvalidMapFeatures(clean);
}

function rebuildPreservingData(newCount) {
  const next = createInitialState(newCount);
  next.cells = { ...state.cells };
  next.edges = { ...state.edges };
  next.points = { ...state.points };
  next.selectedCellId = state.selectedCellId;
  next.influences.enabled = { ...state.influences.enabled };
  next.influences.settings = JSON.parse(JSON.stringify(state.influences.settings));
  state = pruneInvalidMapFeatures(next);
}
