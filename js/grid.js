'use strict';

function cellId(q, r) {
  return `${q},${r}`;
}

function parseCellId(id) {
  const [q, r] = String(id).split(',').map(Number);
  return { q, r };
}

function coordinateKey([a, b]) {
  return `${a},${b}`;
}

function parseCoordinateKey(key) {
  const [a, b] = String(key).split(',').map(Number);
  return [a, b];
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

function scaledAxialToPixel([a, b], scale) {
  return axialToPixel(a / scale, b / scale);
}

function edgeCoordinate(a, b) {
  return [a.q + b.q, a.r + b.r];
}

function edgeKeyFromCells(a, b) {
  return coordinateKey(edgeCoordinate(a, b));
}

function edgeCells([Q, R]) {
  if (Math.abs(Q % 2) === 1 && R % 2 === 0) {
    return [
      { q: (Q - 1) / 2, r: R / 2 },
      { q: (Q + 1) / 2, r: R / 2 }
    ];
  }

  if (Q % 2 === 0 && Math.abs(R % 2) === 1) {
    return [
      { q: Q / 2, r: (R - 1) / 2 },
      { q: Q / 2, r: (R + 1) / 2 }
    ];
  }

  if (Math.abs(Q % 2) === 1 && Math.abs(R % 2) === 1) {
    return [
      { q: (Q - 1) / 2, r: (R + 1) / 2 },
      { q: (Q + 1) / 2, r: (R - 1) / 2 }
    ];
  }

  return [];
}

function pointCoordinate(a, b, c) {
  return [a.q + b.q + c.q, a.r + b.r + c.r];
}

function pointCoordinateForCorner(cell, cornerIndex) {
  const previousDirection = DIRECTIONS[(cornerIndex + 5) % 6];
  const nextDirection = DIRECTIONS[cornerIndex];
  return pointCoordinate(
    cell,
    addAxial(cell, previousDirection),
    addAxial(cell, nextDirection)
  );
}

function pointCells([U, V]) {
  const candidates = [
    [{ q: (U - 2) / 3, r: (V + 1) / 3 }, { q: (U + 1) / 3, r: (V + 1) / 3 }, { q: (U + 1) / 3, r: (V - 2) / 3 }],
    [{ q: (U - 1) / 3, r: (V + 2) / 3 }, { q: (U - 1) / 3, r: (V - 1) / 3 }, { q: (U + 2) / 3, r: (V - 1) / 3 }]
  ];

  return candidates.find(group => group.every(cell => Number.isInteger(cell.q) && Number.isInteger(cell.r))) || [];
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

function getExistingCellType(id) {
  return state.cells[id]?.type || 'plains';
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
