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
