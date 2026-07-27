'use strict';

function movementCost(fromId, toId, influenceType) {
  const edge = state.edges[canonicalEdgeKey(fromId, toId)]?.type || null;
  const fromType = getExistingCellType(fromId);
  const toType = getExistingCellType(toId);

  if (edge === 'river') return Infinity;
  if (toType === 'water' || fromType === 'water') return edge === 'bridge' ? 1 : Infinity;
  if (toType === 'mountains' || fromType === 'mountains') return edge === 'pass' ? 1 : Infinity;
  if (edge === 'road') return 0.5;
  if (edge === 'bridge' || edge === 'pass') return 1;

  return state.influences.settings[influenceType].terrainMultipliers[toType] ?? 1;
}

function calculateMultiSourceReach(originIds, budget, validIds, influenceType) {
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

      const step = movementCost(current.id, neighborId, influenceType);
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

function updateInfluenceSettingsFromControls() {
  let valid = true;

  INFLUENCE_TYPES.forEach(type => {
    const settings = state.influences.settings[type];
    const budget = Number($(`.influence-budget[data-influence-type="${type}"]`).val());
    if (!Number.isFinite(budget) || budget <= 0) valid = false;
    else settings.budget = budget;

    INFLUENCE_TERRAIN_TYPES.forEach(terrainType => {
      const input = $(`.terrain-multiplier[data-influence-type="${type}"][data-terrain-type="${terrainType}"]`);
      const multiplier = Number(input.val());
      if (!Number.isFinite(multiplier) || multiplier <= 0) valid = false;
      else settings.terrainMultipliers[terrainType] = multiplier;
    });
  });

  return valid;
}

function calculateAllInfluences() {
  if (!updateInfluenceSettingsFromControls()) {
    setStatus('Influence budgets and terrain multipliers must be greater than zero.');
    return false;
  }

  const validIds = new Set(generateSpiral(state.cellCount).map(cell => cellId(cell.q, cell.r)));
  const sourceCounts = {};

  INFLUENCE_TYPES.forEach(type => {
    const sources = Object.keys(state.cells).filter(id => validIds.has(id) && state.cells[id].type === type);
    sourceCounts[type] = sources.length;
    state.influences.costs[type] = calculateMultiSourceReach(
      sources,
      state.influences.settings[type].budget,
      validIds,
      type
    );
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
  INFLUENCE_TYPES.forEach(type => {
    const settings = state.influences.settings[type];
    $(`.influence-toggle[data-influence-type="${type}"]`).prop('checked', state.influences.enabled[type]);
    $(`.influence-budget[data-influence-type="${type}"]`).val(settings.budget);

    INFLUENCE_TERRAIN_TYPES.forEach(terrainType => {
      $(`.terrain-multiplier[data-influence-type="${type}"][data-terrain-type="${terrainType}"]`)
        .val(settings.terrainMultipliers[terrainType]);
    });
  });
  updateInfluenceSummary();
}
