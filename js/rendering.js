'use strict';

function terrainSeed(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

function renderTerrainMotifs(layer, definitions, id, type, pos, vertices) {
  const config = TERRAIN_MOTIFS[type];
  if (!config) return;

  const clipId = `terrain-clip-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const clipPath = svgElement('clipPath', { id: clipId });
  clipPath.appendChild(svgElement('polygon', { points: pointsAttribute(vertices) }));
  definitions.appendChild(clipPath);

  const group = svgElement('g', {
    class: `terrain-motifs terrain-motifs-${type}`,
    'clip-path': `url(#${clipId})`
  });
  const random = seededRandom(terrainSeed(`${id}:${type}`));
  const anchors = [
    [-0.42, -0.27], [0, -0.34], [0.42, -0.24],
    [-0.28, 0.16], [0.22, 0.14], [-0.02, 0.34], [0.46, 0.28]
  ];

  for (let index = 0; index < config.count; index += 1) {
    const anchor = anchors[index % anchors.length];
    const symbol = config.symbols[Math.floor(random() * config.symbols.length)];
    const scale = config.scale[0] + random() * (config.scale[1] - config.scale[0]);
    const size = 64 * scale;
    const x = pos.x + anchor[0] * HEX_SIZE * 1.45 + (random() - 0.5) * 5;
    const y = pos.y + anchor[1] * HEX_SIZE * 1.45 + (random() - 0.5) * 4;
    const rotation = (random() - 0.5) * 10;
    const motif = svgElement('use', {
      href: `${config.sheet}#${symbol}`,
      x: -size / 2,
      y: -size / 2,
      width: size,
      height: size,
      transform: `translate(${x} ${y}) rotate(${rotation})`
    });
    group.appendChild(motif);
  }

  layer.appendChild(group);
}

function renderMap(options = {}) {
  const svg = $('#hexMap').empty()[0];
  const cells = generateSpiral(state.cellCount);
  const idSet = new Set(cells.map(cell => cellId(cell.q, cell.r)));
  const positions = {};
  interaction.validCellIds = idSet;

  const definitions = svgElement('defs');
  const cellLayer = svgElement('g');
  const motifLayer = svgElement('g');
  const overlayLayer = svgElement('g');
  const influenceMarkerLayer = svgElement('g');
  const edgeLayer = svgElement('g');
  const pointLayer = svgElement('g');
  const hitLayer = svgElement('g');
  svg.append(definitions, cellLayer, motifLayer, overlayLayer, edgeLayer, pointLayer, influenceMarkerLayer, hitLayer);

  cells.forEach((cell, spiralIndex) => {
    const id = cellId(cell.q, cell.r);
    const pos = axialToPixel(cell.q, cell.r);
    const vertices = polygonPoints(pos.x, pos.y);
    positions[id] = { ...pos, vertices, cell };

    const type = getExistingCellType(id);
    const meta = CELL_TYPES[type];
    const polygon = svgElement('polygon', {
      points: pointsAttribute(vertices),
      fill: meta.fill,
      'data-cell-id': id,
      class: `hex-cell${interaction.selectedCellIds.has(id) || state.selectedCellId === id ? ' selected' : ''}`
    });

    polygon.addEventListener('pointerdown', event => onCellPointerDown(event, id));
    polygon.addEventListener('click', event => onCellClick(event, id));
    cellLayer.appendChild(polygon);
    renderTerrainMotifs(motifLayer, definitions, id, type, pos, vertices);

    if (type === 'none' && spiralIndex === 0) {
      const label = svgElement('text', { x: pos.x, y: pos.y, class: 'hex-label' });
      label.textContent = '0';
      cellLayer.appendChild(label);
    }

    const activeInfluences = INFLUENCE_TYPES.filter(influenceType =>
      state.influences.enabled[influenceType] &&
      Object.prototype.hasOwnProperty.call(state.influences.costs[influenceType], id)
    );

    activeInfluences.forEach(influenceType => {
      overlayLayer.appendChild(svgElement('polygon', {
        points: pointsAttribute(polygonPoints(pos.x, pos.y, 0.88)),
        class: 'influence-overlay',
        fill: CELL_TYPES[influenceType].fill,
        opacity: 0.24
      }));
    });

    if (activeInfluences.length) {
      const spacing = 10;
      const firstX = pos.x + 17 - (activeInfluences.length - 1) * spacing;
      activeInfluences.forEach((influenceType, index) => {
        const x = firstX + index * spacing;
        const y = pos.y - 18;
        influenceMarkerLayer.appendChild(svgElement('circle', { cx: x, cy: y, r: 5, fill: CELL_TYPES[influenceType].fill, class: 'influence-marker' }));
        const glyph = svgElement('text', { x, y: y + 0.5, class: 'influence-glyph' });
        glyph.textContent = CELL_TYPES[influenceType].icon;
        influenceMarkerLayer.appendChild(glyph);
      });
    }
  });

  const renderedEdges = new Set();
  cells.forEach(cell => {
    const id = cellId(cell.q, cell.r);
    DIRECTIONS.forEach((direction, directionIndex) => {
      const neighbor = addAxial(cell, direction);
      const neighborId = cellId(neighbor.q, neighbor.r);
      if (!idSet.has(neighborId)) return;

      const key = edgeKeyFromCells(cell, neighbor);
      if (renderedEdges.has(key)) return;
      renderedEdges.add(key);

      const current = positions[id];
      const a = current.vertices[directionIndex];
      const b = current.vertices[(directionIndex + 1) % 6];
      const feature = state.edges[key];
      if (feature) {
        edgeLayer.appendChild(svgElement('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: `edge-feature ${EDGE_TYPES[feature.type].css}` }));
      }

      if (interaction.mode === 'edge') {
        const hit = svgElement('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'edge-hit', 'data-edge-key': key });
        hit.addEventListener('click', event => onEdgeClick(event, key));
        hitLayer.appendChild(hit);
      }
    });
  });

  if (interaction.mode === 'point' || Object.keys(state.points).length) {
    const renderedPoints = new Set();
    cells.forEach(cell => {
      const id = cellId(cell.q, cell.r);
      positions[id].vertices.forEach((vertex, cornerIndex) => {
        const coordinate = pointCoordinateForCorner(cell, cornerIndex);
        const key = coordinateKey(coordinate);
        if (renderedPoints.has(key)) return;
        renderedPoints.add(key);

        const point = state.points[key];
        if (point) {
          const style = POINT_TYPES[point.type];
          pointLayer.appendChild(svgElement('circle', { cx: vertex.x, cy: vertex.y, r: point.type === 'poi' ? 7 : 6, fill: style.fill, class: 'point-feature' }));
          const glyph = svgElement('text', { x: vertex.x, y: vertex.y + 0.5, class: 'overlay-label', style: 'font-size:8px' });
          glyph.textContent = style.glyph;
          pointLayer.appendChild(glyph);
        }

        if (interaction.mode === 'point') {
          const hit = svgElement('circle', { cx: vertex.x, cy: vertex.y, r: 11, class: 'point-hit' });
          hit.addEventListener('click', event => onPointClick(event, key));
          hitLayer.appendChild(hit);
        }
      });
    });
  }

  if (options.fit || !interaction.baseViewBox) fitViewBox(cells, positions);
  else applyViewBox();
  updateStatus();
}

function fitViewBox(cells, positions) {
  const xs = [];
  const ys = [];
  cells.forEach(cell => {
    positions[cellId(cell.q, cell.r)].vertices.forEach(point => { xs.push(point.x); ys.push(point.y); });
  });
  const padding = HEX_SIZE * 1.6;
  interaction.baseViewBox = {
    x: Math.min(...xs) - padding,
    y: Math.min(...ys) - padding,
    width: Math.max(...xs) - Math.min(...xs) + padding * 2,
    height: Math.max(...ys) - Math.min(...ys) + padding * 2
  };
  interaction.zoom = 1;
  interaction.panX = 0;
  interaction.panY = 0;
  applyViewBox();
}

function applyViewBox() {
  if (!interaction.baseViewBox) return;
  const base = interaction.baseViewBox;
  const width = base.width / interaction.zoom;
  const height = base.height / interaction.zoom;
  const x = base.x + (base.width - width) / 2 + interaction.panX;
  const y = base.y + (base.height - height) / 2 + interaction.panY;
  $('#hexMap').attr('viewBox', `${x} ${y} ${width} ${height}`);
}

function refreshCellClasses() {
  $('.hex-cell').each(function () {
    const id = this.dataset.cellId;
    const gesture = interaction.cellGesture;
    this.classList.toggle('selected', interaction.selectedCellIds.has(id) || state.selectedCellId === id);
    this.classList.toggle('drag-source', Boolean(gesture && !gesture.ctrl && gesture.moved && gesture.sourceId === id));
    this.classList.toggle('drag-target', Boolean(gesture && !gesture.ctrl && gesture.moved && interaction.dragTargetCellId === id && gesture.sourceId !== id));
  });
}

function renderLegend() {
  const entries = Object.entries(CELL_TYPES)
    .filter(([key]) => key !== 'none')
    .map(([, value]) => `
      <div class="col d-flex align-items-center gap-2">
        <span class="legend-swatch" style="background:${value.fill}"></span>
        <span>${value.label}</span>
      </div>
    `)
    .join('');
  $('#terrainLegend').html(entries);
}
