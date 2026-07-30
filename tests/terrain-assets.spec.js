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

  test('renders one transparent PNG motif per terrain cell', async ({ page }) => {
    const motifs = page.locator('.terrain-motifs-forest image');
    await expect(motifs).toHaveCount(1);

    const href = await motifs.first().getAttribute('href');
    expect(href).toMatch(/^assets\/terrain\/forest\/.*\.png$/);
  });

  test('sizes the motif to eighty per cent of the hex diameter', async ({ page }) => {
    const dimensions = await page.locator('.terrain-motifs-forest image').evaluate(node => ({
      width: Number(node.getAttribute('width')),
      height: Number(node.getAttribute('height'))
    }));
    const expected = await page.evaluate(() => HEX_SIZE * 2 * TERRAIN_RENDER_CONFIG.motifCoverage);

    expect(dimensions.width).toBe(expected);
    expect(dimensions.height).toBe(expected);
    expect(await page.evaluate(() => TERRAIN_RENDER_CONFIG.motifCoverage)).toBe(0.8);
  });

  test('selects motifs from axial coordinates without adjacent duplicates', async ({ page }) => {
    const result = await page.evaluate(() => {
      state.cells['1,0'] = { type: 'forest' };
      state.cells['0,1'] = { type: 'forest' };
      renderMap();

      const hrefFor = id => document
        .querySelector(`#terrain-clip-${id.replace(',', '-')} + *`);
      const motifs = [...document.querySelectorAll('.terrain-motifs-forest image')];
      const hrefs = motifs.map(node => node.getAttribute('href'));
      return {
        hrefs,
        expected: [
          TERRAIN_MOTIFS.forest.files[terrainMotifIndex({ q: 0, r: 0 }, TERRAIN_MOTIFS.forest.files.length)],
          TERRAIN_MOTIFS.forest.files[terrainMotifIndex({ q: 1, r: 0 }, TERRAIN_MOTIFS.forest.files.length)],
          TERRAIN_MOTIFS.forest.files[terrainMotifIndex({ q: 0, r: 1 }, TERRAIN_MOTIFS.forest.files.length)]
        ]
      };
    });

    expect(result.hrefs).toEqual(result.expected);
    expect(new Set(result.hrefs).size).toBe(3);
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
    await expect(page.locator('.terrain-motifs-desert image')).toHaveCount(1);
  });
});