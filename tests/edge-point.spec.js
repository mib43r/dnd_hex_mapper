const { test, expect } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const APP_URL = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;

async function openApp(page) {
  await page.goto(APP_URL);
  await expect(page.locator('.hex-cell')).toHaveCount(61);
}

function cell(page, id) {
  return page.locator(`.hex-cell[data-cell-id="${id}"]`);
}

test.describe('edge and point editing', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('applies and clears one shared edge', async ({ page }) => {
    await page.locator('[data-mode="edge"]').click();
    await page.locator('#edgeType').selectOption('road');

    const hit = page.locator('.edge-hit[data-edge-key="0,0|1,0"]');
    await hit.click();
    expect(await page.evaluate(() => state.edges[canonicalEdgeKey('0,0', '1,0')])).toEqual({ type: 'road' });

    await page.locator('#edgeType').selectOption('none');
    await page.locator('.edge-hit[data-edge-key="0,0|1,0"]').click();
    expect(await page.evaluate(() => state.edges[canonicalEdgeKey('0,0', '1,0')])).toBeUndefined();
  });

  test('applies inside edges between selected cells', async ({ page }) => {
    await cell(page, '0,0').click({ modifiers: ['Control'] });
    await cell(page, '1,0').click({ modifiers: ['Control'] });
    await page.locator('[data-mode="edge"]').click();
    await page.locator('#edgeType').selectOption('bridge');
    await page.locator('#applyInsideEdges').click();

    const edges = await page.evaluate(() => state.edges);
    expect(edges).toEqual({ '0,0|1,0': { type: 'bridge' } });
  });

  test('applies and clears outside edges around a selection', async ({ page }) => {
    await cell(page, '0,0').click({ modifiers: ['Control'] });
    await page.locator('[data-mode="edge"]').click();
    await page.locator('#edgeType').selectOption('river');
    await page.locator('#applyOutsideEdges').click();

    expect(await page.evaluate(() => Object.keys(state.edges).length)).toBe(6);
    expect(await page.evaluate(() => Object.values(state.edges).every(edge => edge.type === 'river'))).toBe(true);

    await page.locator('#edgeType').selectOption('none');
    await page.locator('#applyOutsideEdges').click();
    expect(await page.evaluate(() => Object.keys(state.edges).length)).toBe(0);
  });

  test('adds and clears an individual corner point', async ({ page }) => {
    await page.locator('[data-mode="point"]').click();
    await page.locator('#pointType').selectOption('poi');
    await page.locator('.point-hit').first().click();

    const point = await page.evaluate(() => Object.values(state.points)[0]);
    expect(point.type).toBe('poi');
    expect(point.adjacentCellIds.length).toBeGreaterThan(0);
    expect(point.adjacentCellIds.length).toBeLessThanOrEqual(3);

    await page.locator('#pointType').selectOption('none');
    await page.locator('.point-hit').first().click();
    expect(await page.evaluate(() => Object.keys(state.points).length)).toBe(0);
  });
});
