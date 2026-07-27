const { test, expect } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const APP_URL = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;

async function openApp(page) {
  await page.goto(APP_URL);
  await expect(page.locator('.hex-cell')).toHaveCount(61);
}

test.describe('movement and crossing rules', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => {
      state = createInitialState(7);
    });
  });

  test('uses destination terrain cost for normal movement', async ({ page }) => {
    const costs = await page.evaluate(() => {
      state.cells['1,0'] = { type: 'plains' };
      state.cells['0,1'] = { type: 'forest' };
      return {
        plains: movementCost('0,0', '1,0'),
        forest: movementCost('0,0', '0,1')
      };
    });

    expect(costs).toEqual({ plains: 1, forest: 2 });
  });

  test('roads reduce movement cost and rivers block movement', async ({ page }) => {
    const costs = await page.evaluate(() => {
      state.edges[canonicalEdgeKey('0,0', '1,0')] = { type: 'road' };
      state.edges[canonicalEdgeKey('0,0', '0,1')] = { type: 'river' };
      return {
        road: movementCost('0,0', '1,0'),
        river: movementCost('0,0', '0,1')
      };
    });

    expect(costs.road).toBe(0.5);
    expect(costs.river).toBe(Infinity);
  });

  test('requires bridges for water crossings', async ({ page }) => {
    const result = await page.evaluate(() => {
      state.cells['1,0'] = { type: 'water' };
      const blocked = movementCost('0,0', '1,0');
      state.edges[canonicalEdgeKey('0,0', '1,0')] = { type: 'bridge' };
      const bridged = movementCost('0,0', '1,0');
      return { blocked, bridged };
    });

    expect(result.blocked).toBe(Infinity);
    expect(result.bridged).toBe(1);
  });

  test('requires mountain passes for mountain crossings', async ({ page }) => {
    const result = await page.evaluate(() => {
      state.cells['1,0'] = { type: 'mountains' };
      const blocked = movementCost('0,0', '1,0');
      state.edges[canonicalEdgeKey('0,0', '1,0')] = { type: 'pass' };
      const passed = movementCost('0,0', '1,0');
      return { blocked, passed };
    });

    expect(result.blocked).toBe(Infinity);
    expect(result.passed).toBe(1);
  });

  test('treats bridge and pass edges as normal-cost crossings elsewhere', async ({ page }) => {
    const costs = await page.evaluate(() => {
      state.edges[canonicalEdgeKey('0,0', '1,0')] = { type: 'bridge' };
      state.edges[canonicalEdgeKey('0,0', '0,1')] = { type: 'pass' };
      return {
        bridge: movementCost('0,0', '1,0'),
        pass: movementCost('0,0', '0,1')
      };
    });

    expect(costs).toEqual({ bridge: 1, pass: 1 });
  });
});
