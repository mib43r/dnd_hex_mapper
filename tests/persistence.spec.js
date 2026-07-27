const { test, expect } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const APP_URL = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;

async function openApp(page) {
  await page.goto(APP_URL);
  await expect(page.locator('.hex-cell')).toHaveCount(61);
}

test.describe('JSON persistence and migration', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('exports and restores persisted map characteristics', async ({ page }) => {
    await page.evaluate(() => {
      state.cells = {
        '0,0': { type: 'forest' },
        '1,0': { type: 'city' }
      };
      state.edges[canonicalEdgeKey('0,0', '1,0')] = { type: 'road' };
      state.points['100,200'] = {
        type: 'town',
        x: 0.1,
        y: 0.2,
        adjacentCellIds: ['0,0', '1,0']
      };
      state.selectedCellId = '1,0';
      state.influences.budget = 4;
      state.influences.enabled.city = false;
      renderMap();
    });

    await page.locator('#travelBudget').fill('4');
    await page.locator('#exportJson').click();
    const exportedText = await page.locator('#jsonState').inputValue();
    const exported = JSON.parse(exportedText);

    expect(exported.schemaVersion).toBe(2);
    expect(exported.cells['0,0']).toEqual({ type: 'forest' });
    expect(exported.edges['0,0|1,0']).toEqual({ type: 'road' });
    expect(exported.points['100,200'].type).toBe('town');
    expect(exported.influences.enabled.city).toBe(false);
    expect(exported.influences.costs).toBeUndefined();

    await page.evaluate(() => {
      state = createInitialState(1);
      renderMap({ fit: true });
    });
    await page.locator('#jsonState').fill(exportedText);
    await page.locator('#importJson').click();

    const restored = await page.evaluate(() => ({
      cellCount: state.cellCount,
      cells: state.cells,
      edges: state.edges,
      points: state.points,
      selectedCellId: state.selectedCellId,
      budget: state.influences.budget,
      cityEnabled: state.influences.enabled.city
    }));
    expect(restored.cellCount).toBe(61);
    expect(restored.cells['0,0']).toEqual({ type: 'forest' });
    expect(restored.edges['0,0|1,0']).toEqual({ type: 'road' });
    expect(restored.points['100,200'].type).toBe('town');
    expect(restored.selectedCellId).toBe('1,0');
    expect(restored.budget).toBe(4);
    expect(restored.cityEnabled).toBe(false);
  });

  test('recalculates derived influence costs after import', async ({ page }) => {
    const imported = {
      schemaVersion: 2,
      cellCount: 7,
      cells: {
        '0,0': { type: 'forest' },
        '1,0': { type: 'grain' },
        '0,1': { type: 'city' }
      },
      edges: {},
      points: {},
      selectedCellId: null,
      influences: {
        budget: 2,
        enabled: { forest: true, grain: true, city: true },
        calculated: true
      }
    };

    await page.locator('#jsonState').fill(JSON.stringify(imported));
    await page.locator('#importJson').click();

    const result = await page.evaluate(() => ({
      calculated: state.influences.calculated,
      forest: Object.keys(state.influences.costs.forest).length,
      grain: Object.keys(state.influences.costs.grain).length,
      city: Object.keys(state.influences.costs.city).length
    }));
    expect(result.calculated).toBe(true);
    expect(result.forest).toBeGreaterThan(0);
    expect(result.grain).toBeGreaterThan(0);
    expect(result.city).toBeGreaterThan(0);
  });

  test('migrates the legacy overlay budget into schema version 2', async ({ page }) => {
    const migrated = await page.evaluate(() => sanitizeState({
      schemaVersion: 1,
      cellCount: 7,
      cells: { '0,0': { type: 'grain' } },
      edges: {},
      points: {},
      overlay: { budget: 6 }
    }));

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.influences.budget).toBe(6);
    expect(migrated.influences.calculated).toBe(false);
  });

  test('filters invalid cells, edges, points, and selected IDs', async ({ page }) => {
    const clean = await page.evaluate(() => sanitizeState({
      cellCount: 7,
      cells: {
        '0,0': { type: 'forest' },
        '99,99': { type: 'city' },
        '1,0': { type: 'unknown' }
      },
      edges: {
        '0,0|1,0': { type: 'road' },
        '0,0|99,99': { type: 'river' },
        '0,0|0,1': { type: 'unknown' }
      },
      points: {
        valid: { type: 'poi', x: 1, y: 2, adjacentCellIds: ['0,0', '99,99'] },
        invalid: { type: 'unknown', x: 1, y: 2 }
      },
      selectedCellId: '99,99'
    }));

    expect(clean.cells).toEqual({ '0,0': { type: 'forest' } });
    expect(clean.edges).toEqual({ '0,0|1,0': { type: 'road' } });
    expect(clean.points.valid.adjacentCellIds).toEqual(['0,0']);
    expect(clean.points.invalid).toBeUndefined();
    expect(clean.selectedCellId).toBeNull();
  });

  test('reports malformed JSON without replacing the current map', async ({ page }) => {
    await page.evaluate(() => {
      state.cells['0,0'] = { type: 'forest' };
    });
    await page.locator('#jsonState').fill('{broken json');
    await page.locator('#importJson').click();

    await expect(page.locator('#statusText')).toContainText('Import failed:');
    expect(await page.evaluate(() => state.cells['0,0'])).toEqual({ type: 'forest' });
  });
});
