const { test, expect } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const APP_URL = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;

async function openApp(page) {
  await page.goto(APP_URL);
  await expect(page.locator('.hex-cell')).toHaveCount(61);
}

function parseViewBox(value) {
  return value.split(/\s+/).map(Number);
}

test.describe('viewport and large-map behavior', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('rebuilds and renders the maximum 1,500-cell map', async ({ page }) => {
    test.slow();
    await page.locator('#cellCount').fill('1500');
    await page.locator('#rebuildMap').click();

    await expect(page.locator('.hex-cell')).toHaveCount(1500);
    expect(await page.evaluate(() => state.cellCount)).toBe(1500);
    await expect(page.locator('#statusText')).toContainText('Map rebuilt with 1500 cells.');
  });

  test('clamps oversized rebuild requests to 1,500 cells', async ({ page }) => {
    test.slow();
    await page.locator('#cellCount').fill('5000');
    await page.locator('#rebuildMap').click();

    await expect(page.locator('#cellCount')).toHaveValue('1500');
    await expect(page.locator('.hex-cell')).toHaveCount(1500);
  });

  test('renders inactive maps without edge and point hit targets', async ({ page }) => {
    await expect(page.locator('.edge-hit')).toHaveCount(0);
    await expect(page.locator('.point-hit')).toHaveCount(0);

    await page.locator('[data-mode="edge"]').click();
    expect(await page.locator('.edge-hit').count()).toBeGreaterThan(0);
    await expect(page.locator('.point-hit')).toHaveCount(0);

    await page.locator('[data-mode="point"]').click();
    await expect(page.locator('.edge-hit')).toHaveCount(0);
    expect(await page.locator('.point-hit').count()).toBeGreaterThan(0);
  });

  test('zooms in, zooms out, and restores the fitted view', async ({ page }) => {
    const initial = parseViewBox(await page.locator('#hexMap').getAttribute('viewBox'));

    await page.locator('#zoomIn').click();
    const zoomedIn = parseViewBox(await page.locator('#hexMap').getAttribute('viewBox'));
    expect(zoomedIn[2]).toBeLessThan(initial[2]);
    expect(zoomedIn[3]).toBeLessThan(initial[3]);

    await page.locator('#zoomOut').click();
    const zoomedOut = parseViewBox(await page.locator('#hexMap').getAttribute('viewBox'));
    expect(zoomedOut[2]).toBeCloseTo(initial[2], 5);
    expect(zoomedOut[3]).toBeCloseTo(initial[3], 5);

    await page.locator('#zoomIn').click();
    await page.locator('#fitMap').click();
    const fitted = parseViewBox(await page.locator('#hexMap').getAttribute('viewBox'));
    expect(fitted).toEqual(initial);
  });

  test('supports wheel zooming over the map', async ({ page }) => {
    const map = page.locator('#hexMap');
    const box = await map.boundingBox();
    expect(box).not.toBeNull();
    const before = parseViewBox(await map.getAttribute('viewBox'));

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -300);
    const after = parseViewBox(await map.getAttribute('viewBox'));

    expect(after[2]).toBeLessThan(before[2]);
  });

  test('pans with Shift-drag while keeping the zoom level', async ({ page }) => {
    const map = page.locator('#hexMap');
    const box = await map.boundingBox();
    expect(box).not.toBeNull();
    const before = parseViewBox(await map.getAttribute('viewBox'));

    await page.keyboard.down('Shift');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 40, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up('Shift');

    const after = parseViewBox(await map.getAttribute('viewBox'));
    expect(after[0]).not.toBe(before[0]);
    expect(after[1]).not.toBe(before[1]);
    expect(after[2]).toBe(before[2]);
    expect(after[3]).toBe(before[3]);
  });
});
