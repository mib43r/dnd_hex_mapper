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

const TERRAIN_RENDER_CONFIG = {
  clipInset: 0.05,
  motifCoverage: 0.8,
  maxRotation: 5
};

const TERRAIN_MOTIFS = {
  plains: {
    files: [
      'assets/terrain/plains/bushes-2.png',
      'assets/terrain/plains/crossroad-1.png',
      'assets/terrain/plains/hills-1.png',
      'assets/terrain/plains/bushes-1.png',
      'assets/terrain/plains/gras-1.png'
    ]
  },
  forest: {
    files: [
      'assets/terrain/forest/forest-1.png',
      'assets/terrain/forest/forest-2.png',
      'assets/terrain/forest/forest-3.png',
      'assets/terrain/forest/forest-4.png',
      'assets/terrain/forest/forest-5.png'
    ]
  },
  desert: {
    files: [
      'assets/terrain/desert/cacti-1.png',
      'assets/terrain/desert/caravan-1.png',
      'assets/terrain/desert/dune-1.png',
      'assets/terrain/desert/rocks-1.png',
      'assets/terrain/desert/ruined-fort-1.png'
    ]
  },
  water: {
    files: [
      'assets/terrain/water/dolphins-1.png',
      'assets/terrain/water/fish-1.png',
      'assets/terrain/water/seagulls-1.png',
      'assets/terrain/water/ship-1.png',
      'assets/terrain/water/wave-1.png'
    ]
  },
  mountains: {
    files: [
      'assets/terrain/mountains/mountain-1.png',
      'assets/terrain/mountains/mountain-2.png',
      'assets/terrain/mountains/mountain-3.png',
      'assets/terrain/mountains/ridge-1.png',
      'assets/terrain/mountains/ridge-2.png'
    ]
  },
  grain: {
    files: [
      'assets/terrain/grain/cow-pasture-1.png',
      'assets/terrain/grain/fields-1.png',
      'assets/terrain/grain/grain-circle-1.png',
      'assets/terrain/grain/scarecrow-1.png',
      'assets/terrain/grain/wheat-fields-1.png'
    ]
  },
  city: {
    files: [
      'assets/terrain/city/city-1.png',
      'assets/terrain/city/city-2.png',
      'assets/terrain/city/gate-1.png',
      'assets/terrain/city/house-1.png',
      'assets/terrain/city/house-2.png',
      'assets/terrain/city/tower-1.png'
    ]
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
    if (!this.items.length) return undefined;
    const root = this.items[0];
    const last = this.items.pop();
    if (!this.items.length) return root;

    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.items.length) break;

      let child = left;
      if (right < this.items.length && this.items[right].cost < this.items[left].cost) child = right;
      if (this.items[child].cost >= last.cost) break;

      this.items[index] = this.items[child];
      index = child;
    }

    this.items[index] = last;
    return root;
  }

  get size() {
    return this.items.length;
  }
}