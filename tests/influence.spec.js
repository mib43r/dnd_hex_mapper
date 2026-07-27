const { test, expect } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const APP_URL = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;

async function openApp(page) {
  await page.goto(APP_URL);
  await expect(page.locator('.hex-cell')).toHaveCount(61);
}

async function seedInfluenceSources(page) {
  await page.evaluate(() => {
    state.cells = {
      '0,0': { type: 'forest' },
      '1,0': { type: 'grain' },
      '0,1': { type: 'city' }
    };
    invalidateInfluences();
    renderMap();
  });
}

test.describe('simultaneous influence overlays', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await seedInfluenceSources(page);
  });

  test('calculates forest, grain, and city reach together', async ({ page }) => {
    await page.locator('#travelBudget').fill('3');
    await page.locator('#calculateInfluences').click();

    const result = await page.evaluate(() => ({
      calculated: state.influences.calculated,
      forest: Object.keys(state.influences.costs.forest).length,
      grain: Object.keys(state.influences.costs.grain).length,
      city: Object.keys(state.influences.costs.city).length,
      sourceCosts: {
        forest: state.influences.costs.forest['0,0'],
        grain: state.influences.costs.grain['1,0'],
        city: state.influences.costs.city['0,1']
      }
    }));

    expect(result.calculated).toBe(true);
    expect(result.forest).toBeGreaterThan(1);
    expect(result.grain).toBeGreaterThan(1);
    expect(result.city).toBeGreaterThan(1);
    expect(result.sourceCosts).toEqual({ forest: 0, grain: 0, city: 0 });
    await expect(page.locator('.influence-overlay')).toHaveCount(result.forest + result.grain + result.city);
    await expect(page.locator('.influence-marker')).toHaveCount(result.forest + result.grain + result.city);
  });

  test('uses every matching cell as an origin for its influence class', async ({ page }) => {
    await page.evaluate(() => {
      state.cells['-1,0'] = { type: 'forest' };
      renderMap();
    });
    await page.locator('#travelBudget').fill('1');
    await page.locator('#calculateInfluences').click();

    const costs = await page.evaluate(() => ({
      first: state.influences.costs.forest['0,0'],
      second: state.influences.costs.forest['-1,0']
    }));
    expect(costs).toEqual({ first: 0, second: 0 });
  });

  test('shows grouped symbols when all three influences reach one cell', async ({ page }) => {
    await page.locator('#travelBudget').fill('3');
    await page.locator('#calculateInfluences').click();

    const centerInfluences = await page.evaluate(() => INFLUENCE_TYPES.filter(type =>
      Object.prototype.hasOwnProperty.call(state.influences.costs[type], '0,0')
    ));
    expect(centerInfluences).toEqual(['forest', 'grain', 'city']);

    const center = await page.locator('.hex-cell[data-cell-id="0,0"]').boundingBox();
    expect(center).not.toBeNull();
    const nearbyMarkers = await page.locator('.influence-marker').evaluateAll((nodes, box) => nodes.filter(node => {
      const x = Number(node.getAttribute('cx'));
      const y = Number(node.getAttribute('cy'));
      const svg = node.ownerSVGElement;
      const point = svg.createSVGPoint();
      point.x = x;
      point.y = y;
      const screen = point.matrixTransform(svg.getScreenCTM());
      return screen.x >= box.x && screen.x <= box.x + box.width && screen.y >= box.y && screen.y <= box.y + box.height;
    }).length, center);
    expect(nearbyMarkers).toBe(3);
  });

  test('toggles each calculated layer without recalculating others', async ({ page }) => {
    await page.locator('#calculateInfluences').click();
    const before = await page.evaluate(() => ({
      cityCount: Object.keys(state.influences.costs.city).length,
      allCount: INFLUENCE_TYPES.reduce((sum, type) => sum + Object.keys(state.influences.costs[type]).length, 0)
    }));

    await page.locator('#toggleCity').uncheck();
    expect(await page.evaluate(() => state.influences.enabled.city)).toBe(false);
    await expect(page.locator('.influence-marker')).toHaveCount(before.allCount - before.cityCount);
    expect(await page.evaluate(() => Object.keys(state.influences.costs.city).length)).toBe(before.cityCount);

    await page.locator('#toggleCity').check();
    await expect(page.locator('.influence-marker')).toHaveCount(before.allCount);
  });

  test('clears all derived influence overlays', async ({ page }) => {
    await page.locator('#calculateInfluences').click();
    await page.locator('#clearInfluences').click();

    expect(await page.evaluate(() => ({
      calculated: state.influences.calculated,
      costs: state.influences.costs
    }))).toEqual({
      calculated: false,
      costs: { forest: {}, grain: {}, city: {} }
    });
    await expect(page.locator('.influence-overlay')).toHaveCount(0);
    await expect(page.locator('.influence-marker')).toHaveCount(0);
  });
});
