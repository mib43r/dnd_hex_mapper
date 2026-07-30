const { test, expect } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const APP_URL = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;

async function openApp(page) {
  await page.goto(APP_URL);
  await expect(page.locator('.hex-cell')).toHaveCount(61);
}

test.describe('standalone terrain assets', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => {
      state.cells['0,0'] = { type: 'forest' };
      renderMap();
    });
  });

  test('renders direct standalone SVG references without sprite fragments', async ({ page }) => {
    const motifs = page.locator('.terrain-motifs-forest use');
    await expect(motifs).toHaveCount(7);

    const hrefs = await motifs.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    expect(hrefs.every(href => href.startsWith('assets/terrain/forest/'))).toBe(true);
    expect(hrefs.every(href => href.endsWith('.svg'))).toBe(true);
    expect(hrefs.every(href => !href.includes('#'))).toBe(true);
    expect(hrefs.every(href => !href.includes('assets/textures'))).toBe(true);
  });

  test('renders transparent mountain PNG references as SVG images', async ({ page }) => {
    await page.evaluate(() => {
      state.cells['0,0'] = { type: 'mountains' };
      renderMap();
    });

    const motifs = page.locator('.terrain-motifs-mountains image');
    await expect(motifs).toHaveCount(5);
    const hrefs = await motifs.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    expect(hrefs.every(href => href.startsWith('assets/terrain/mountains/'))).toBe(true);
    expect(hrefs.every(href => href.endsWith('.png'))).toBe(true);
  });

  test('clips motifs to a five per cent inset hexagon', async ({ page }) => {
    const result = await page.evaluate(() => {
      const clipPolygon = document.querySelector('#terrain-clip-0-0 polygon');
      const expected = pointsAttribute(polygonPoints(0, 0, 1 - TERRAIN_RENDER_CONFIG.clipInset));
      return {
        inset: TERRAIN_RENDER_CONFIG.clipInset,
        actual: clipPolygon?.getAttribute('points'),
        expected
      };
    });

    expect(result.inset).toBe(0.05);
    expect(result.actual).toBe(result.expected);
  });

  test('keeps terrain artwork outside pointer interaction', async ({ page }) => {
    await expect(page.locator('.terrain-motifs')).toHaveCSS('pointer-events', 'none');

    await page.locator('#cellType').selectOption('desert');
    await page.locator('[data-cell-id="0,0"]').click();

    expect(await page.evaluate(() => state.cells['0,0'].type)).toBe('desert');
    await expect(page.locator('.terrain-motifs-desert use')).toHaveCount(5);
  });
});
