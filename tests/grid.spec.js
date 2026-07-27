const { test, expect } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const APP_URL = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;

async function openApp(page) {
  await page.goto(APP_URL);
  await expect(page.locator('.hex-cell')).toHaveCount(61);
}

test.describe('grid and map data utilities', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('generates the requested clockwise spiral without duplicate cells', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cells = generateSpiral(19);
      return {
        cells,
        ids: cells.map(cell => cellId(cell.q, cell.r))
      };
    });

    expect(result.cells).toHaveLength(19);
    expect(result.cells[0]).toEqual({ q: 0, r: 0 });
    expect(result.cells.slice(1, 7)).toEqual([
      { q: 0, r: -1 },
      { q: 1, r: -1 },
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: -1, r: 1 },
      { q: -1, r: 0 }
    ]);
    expect(new Set(result.ids).size).toBe(19);
  });

  test('clamps map sizes to the supported range', async ({ page }) => {
    const values = await page.evaluate(() => ({
      below: clampCellCount(-10),
      invalid: clampCellCount('not-a-number'),
      normal: clampCellCount(61),
      above: clampCellCount(2000)
    }));

    expect(values).toEqual({ below: 1, invalid: 1, normal: 61, above: 1500 });
  });

  test('round-trips axial cell identifiers', async ({ page }) => {
    const value = await page.evaluate(() => {
      const id = cellId(-12, 34);
      return { id, parsed: parseCellId(id) };
    });

    expect(value).toEqual({ id: '-12,34', parsed: { q: -12, r: 34 } });
  });

  test('canonicalizes shared edges and rounded vertices', async ({ page }) => {
    const value = await page.evaluate(() => ({
      edgeForward: canonicalEdgeKey('0,0', '1,0'),
      edgeReverse: canonicalEdgeKey('1,0', '0,0'),
      pointA: canonicalPointKey({ x: 12.34549, y: -6.78949 }),
      pointB: canonicalPointKey({ x: 12.3454, y: -6.7894 })
    }));

    expect(value.edgeForward).toBe(value.edgeReverse);
    expect(value.pointA).toBe(value.pointB);
  });
});
