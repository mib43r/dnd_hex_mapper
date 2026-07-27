'use strict';

const HEX_SIZE = 34;
const SQRT3 = Math.sqrt(3);
const MAX_CELLS = 1500;
const INFLUENCE_TYPES = ['forest', 'grain', 'city'];
const DIRECTIONS = [
  { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
  { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 }
];

const CELL_TYPES = {
  none:      { label: 'Unassigned', fill: '#f8f9fa', icon: '', cost: 1 },
  plains:    { label: 'Plains', fill: '#b7d99a', icon: '·', cost: 1 },
  forest:    { label: 'Forest', fill: '#4f8a5b', icon: '♣', cost: 2 },
  desert:    { label: 'Desert', fill: '#e9c46a', icon: '≈', cost: 1 },
  water:     { label: 'Water', fill: '#73bde3', icon: '≋', cost: Infinity },
  mountains: { label: 'Mountains', fill: '#9d9d9d', icon: '▲', cost: Infinity },
  grain:     { label: 'Grain field', fill: '#f4d35e', icon: '✦', cost: 1 },
  city:      { label: 'City', fill: '#cdb4db', icon: '◆', cost: 1 }
};

const TERRAIN_MOTIFS = {
  plains: {
    sheet: 'assets/textures/motifs/plains.svg',
    symbols: ['grass-1', 'grass-2', 'hill-1', 'stone-1', 'tuft-1'],
    count: 5,
    scale: [0.34, 0.48]
  },
  forest: {
    sheet: 'assets/textures/motifs/forest.svg',
    symbols: ['tree-1', 'tree-2', 'tree-3', 'tree-4', 'tree-5'],
    count: 7,
    scale: [0.42, 0.62]
  },
  desert: {
    sheet: 'assets/textures/motifs/desert.svg',
    symbols: ['dune-1', 'dune-2', 'rock-1', 'scrub-1', 'scrub-2'],
    count: 5,
    scale: [0.38, 0.56]
  },
  water: {
    sheet: 'assets/textures/motifs/water.svg',
    symbols: ['wave-1', 'wave-2', 'wave-3', 'reed-1', 'islet-1'],
    count: 6,
    scale: [0.36, 0.52]
  },
  mountains: {
    sheet: 'assets/textures/motifs/mountains.svg',
    symbols: ['peak-1', 'peak-2', 'peak-3', 'ridge-1', 'ridge-2'],
    count: 5,
    scale: [0.48, 0.68]
  },
  grain: {
    sheet: 'assets/textures/motifs/grain.svg',
    symbols: ['field-1', 'field-2', 'haystack-1', 'sheaf-1', 'farm-road-1'],
    count: 5,
    scale: [0.38, 0.58]
  },
  city: {
    sheet: 'assets/textures/motifs/city.svg',
    symbols: ['house-1', 'house-2', 'tower-1', 'wall-1', 'gate-1'],
    count: 6,
    scale: [0.34, 0.5]
  }
};

const EDGE_TYPES = {
  road: { label: 'Road', css: 'edge-road' },
  river: { label: 'River', css: 'edge-river' },
  pass: { label: 'Mountain pass', css: 'edge-pass' },
  bridge: { label: 'Bridge', css: 'edge-bridge' }
};

const POINT_TYPES = {
  town: { label: 'Town', fill: '#dc3545', glyph: '●' },
  toll: { label: 'Toll station', fill: '#212529', glyph: '■' },
  poi: { label: 'Point of interest', fill: '#6f42c1', glyph: '★' }
};

class MinHeap {
  constructor() {
    this.items = [];
  }

  push(item) {
    this.items.push(item);
    let index = this.items.length - 1;

    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].cost <= item.cost) break;
      this.items[index] = this.items[parent];
      index = parent;
    }

    this.items[index] = item;
  }

  pop() {
    if (!this.items.length) return null;

    const root = this.items[0];
    const last = this.items.pop();

    if (this.items.length && last) {
      let index = 0;

      while (true) {
        let child = index * 2 + 1;
        if (child >= this.items.length) break;
        if (child + 1 < this.items.length && this.items[child + 1].cost < this.items[child].cost) child += 1;
        if (this.items[child].cost >= last.cost) break;
        this.items[index] = this.items[child];
        index = child;
      }

      this.items[index] = last;
    }

    return root;
  }

  get length() {
    return this.items.length;
  }
}
