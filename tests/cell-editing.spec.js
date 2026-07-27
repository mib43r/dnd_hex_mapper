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

test.describe('cell editing and selection', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('paints a single cell with the selected terrain', async ({ page }) => {
    await page.locator('#cellType').selectOption('forest');
    await cell(page, '0,0').click();

    await expect(cell(page, '0,0')).toHaveAttribute('fill', '#4f8a5b');
    expect(await page.evaluate(() => state.cells['0,0'])).toEqual({ type: 'forest' });
  });

  test('adds and removes cells with Ctrl-click', async ({ page }) => {
    await cell(page, '0,0').click({ modifiers: ['Control'] });
    await cell(page, '1,0').click({ modifiers: ['Control'] });

    await expect(cell(page, '0,0')).toHaveClass(/selected/);
    await expect(cell(page, '1,0')).toHaveClass(/selected/);
    expect(await page.evaluate(() => [...interaction.selectedCellIds].sort())).toEqual(['0,0', '1,0']);

    await cell(page, '0,0').click({ modifiers: ['Control'] });
    expect(await page.evaluate(() => [...interaction.selectedCellIds])).toEqual(['1,0']);
  });

  test('fills, overwrites, and clears all selected cells', async ({ page }) => {
    for (const id of ['0,0', '1,0', '0,1']) {
      await cell(page, id).click({ modifiers: ['Control'] });
    }

    await page.locator('#cellType').selectOption('grain');
    await page.locator('#applyCellsToSelection').click();

    expect(await page.evaluate(() => ['0,0', '1,0', '0,1'].map(id => state.cells[id]?.type))).toEqual([
      'grain',
      'grain',
      'grain'
    ]);

    await page.locator('#cellType').selectOption('city');
    await page.locator('#applyCellsToSelection').click();
    expect(await page.evaluate(() => ['0,0', '1,0', '0,1'].map(id => state.cells[id]?.type))).toEqual([
      'city',
      'city',
      'city'
    ]);

    await page.locator('#cellType').selectOption('none');
    await page.locator('#applyCellsToSelection').click();
    expect(await page.evaluate(() => ['0,0', '1,0', '0,1'].every(id => state.cells[id] === undefined))).toBe(true);
  });

  test('swaps cell contents by dragging between cells', async ({ page }) => {
    await page.evaluate(() => {
      state.cells['0,0'] = { type: 'forest' };
      state.cells['1,0'] = { type: 'desert' };
      renderMap();
    });

    const sourceBox = await cell(page, '0,0').boundingBox();
    const targetBox = await cell(page, '1,0').boundingBox();
    expect(sourceBox).not.toBeNull();
    expect(targetBox).not.toBeNull();

    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 8 });
    await page.mouse.up();

    expect(await page.evaluate(() => ({
      source: state.cells['0,0']?.type,
      target: state.cells['1,0']?.type
    }))).toEqual({ source: 'desert', target: 'forest' });
  });
});
