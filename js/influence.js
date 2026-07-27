'use strict';

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
