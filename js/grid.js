'use strict';

function cellId(q, r) {
  return `${q},${r}`;
}

function parseCellId(id) {
  const [q, r] = String(id).split(',').map(Number);
  return { q, r };
}

function addAxial(a, b) {
  return { q: a.q + b.q, r: a.r + b.r };
}

function axialToPixel(q, r) {
  return {
    x: HEX_SIZE * SQRT3 * (q + r / 2),
    y: HEX_SIZE * 1.5 * r
  };
}

function polygonPoints(cx, cy, scale = 1) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 180 * (60 * index - 30);
    return {
      x: cx + HEX_SIZE * scale * Math.cos(angle),
      y: cy + HEX_SIZE * scale * Math.sin(angle)
    };
  });
}

function pointsAttribute(points) {
  return points.map(point => `${point.x.toFixed(3)},${point.y.toFixed(3)}`).join(' ');
}

function generateSpiral(count) {
  const cells = [{ q: 0, r: 0 }];

  for (let radius = 1; cells.length < count; radius += 1) {
    let cursor = { q: 0, r: -radius };

    for (let side = 0; side < 6 && cells.length < count; side += 1) {
      for (let step = 0; step < radius && cells.length < count; step += 1) {
        cells.push({ ...cursor });
        cursor = addAxial(cursor, DIRECTIONS[side]);
      }
    }
  }

  return cells.slice(0, count);
}

function canonicalEdgeKey(a, b) {
  return [a, b].sort().join('|');
}

function canonicalPointKey(point) {
  return `${Math.round(point.x * 1000)},${Math.round(point.y * 1000)}`;
}

function getExistingCellType(id) {
  return state.cells[id]?.type || 'none';
}

function getNeighborId(cell, index) {
  const direction = DIRECTIONS[index];
  return cellId(cell.q + direction.q, cell.r + direction.r);
}

function svgElement(name, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}
