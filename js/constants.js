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
  clipInset: 0.05
};

const TERRAIN_MOTIFS = {
  plains: {
    files: [
      'assets/terrain/plains/bushes-2.png',
      'assets/terrain/plains/crossroad-1.png',
      'assets/terrain/plains/hills-1.png',
      'assets/terrain/plains/bushes-1.png',
      'assets/terrain/plains/gras-1.png'
    ],
    count: 5,
    scale: [0.34, 0.48]
  },
  forest: {
    files: [
      'assets/terrain/forest/forest-1.png',
      'assets/terrain/forest/forest-2.png',
      'assets/terrain/forest/forest-3.png',
      'assets/terrain/forest/forest-4.png',
      'assets/terrain/forest/forest-5.png'
    ],
    count: 7,
    scale: [0.42, 0.62]
  },
  desert: {
    files: [
      'assets/terrain/desert/cacti-1.png',
      'assets/terrain/desert/caravan-1.png',
      'assets/terrain/desert/dune-1.png',
      'assets/terrain/desert/rocks-1.png',
      'assets/terrain/desert/ruined-fort-1.png'
    ],
    count: 5,
    scale: [0.38, 0.56]
  },
  water: {
    files: [
      'assets/terrain/water/dolphins-1.png',
      'assets/terrain/water/fish-1.png',
      'assets/terrain/water/seagulls-1.png',
      'assets/terrain/water/ship-1.png',
      'assets/terrain/water/wave-1.png'
    ],
    count: 6,
    scale: [0.36, 0.52]
  },
  mountains: {
    files: [
      'assets/terrain/mountains/mountain-1.png',
      'assets/terrain/mountains/mountain-2.png',
      'assets/terrain/mountains/mountain-3.png',
      'assets/terrain/mountains/ridge-1.png',
      'assets/terrain/mountains/ridge-2.png'
    ],
    count: 5,
    scale: [0.48, 0.68]
  },
  grain: {
    files: [
      'assets/terrain/grain/cow-pasture-1.png',
      'assets/terrain/grain/fields-1.png',
      'assets/terrain/grain/grain-circle-1.png',
      'assets/terrain/grain/scarecrow-1.png',
      'assets/terrain/grain/wheat-fields-1.png'
    ],
    count: 5,
    scale: [0.38, 0.58]
  },
  city: {
    files: [
      'assets/terrain/city/city-1.png',
      'assets/terrain/city/city-2.png',
      'assets/terrain/city/gate-1.png',
      'assets/terrain/city/house-1.png',
      'assets/terrain/city/house-2.png',
      'assets/terrain/city/tower-1.png'
    ],
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
