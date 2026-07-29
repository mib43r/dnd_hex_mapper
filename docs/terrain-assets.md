# Terrain asset conventions

Terrain artwork is stored as directly editable standalone SVG files under `assets/terrain/`.

## Folder structure

Each terrain has its own folder:

```text
assets/terrain/
  plains/
  forest/
  desert/
  water/
  mountains/
  grain/
  city/
```

Every motif is a separate file, for example:

```text
assets/terrain/forest/tree-1.svg
assets/terrain/mountains/peak-2.svg
assets/terrain/city/tower-1.svg
```

The configured file paths are listed explicitly in `TERRAIN_MOTIFS` in `js/constants.js`.

## SVG format

Each motif should:

- use `viewBox="0 0 64 64"`;
- contain visible artwork directly inside the root `<svg>` element;
- open visibly in a browser or SVG editor without application CSS;
- use `#2F302B` for the monochrome artwork;
- keep transparent areas transparent;
- avoid scripts, embedded raster images, external stylesheets, fonts, and filters;
- use simple paths, shapes, fills, and strokes that remain legible at small sizes.

White interior cut-outs may use `#fff` where they are part of the intended motif design.

## Composition and clipping

The renderer selects motifs deterministically from the configured files. A cell therefore keeps the same composition across rerenders as long as its coordinate and terrain type do not change.

For every placed motif, the renderer varies:

- selected file;
- position around a fixed set of anchors;
- scale within the terrain's configured range;
- rotation by a small amount.

Motifs are clipped to a smaller hexagon controlled by:

```js
const TERRAIN_RENDER_CONFIG = {
  clipInset: 0.05
};
```

`clipInset` is a fraction of the original hexagon radius. A value of `0.05` creates a clipping polygon at `0.95` scale, leaving a 5% clear border around the terrain artwork. The inset polygon is geometrically similar to the original hexagon.

## Editing a motif

1. Open the individual SVG file in Inkscape, Boxy SVG, Illustrator, Figma, or a text editor.
2. Edit the visible paths and shapes while keeping the `64 × 64` view box.
3. Save the SVG in place.
4. Refresh the map in the browser.

There is no build or asset-compilation step.

## Adding a motif

1. Add a new standalone SVG to the appropriate terrain folder.
2. Add its repository-relative path to that terrain's `files` array in `TERRAIN_MOTIFS`.
3. Keep the file name lowercase and hyphenated, such as `tree-6.svg` or `ridge-3.svg`.
4. Open the application and verify that the motif appears at small map scale.
5. Run the minimal Playwright suite.

## Removing or renaming a motif

Remove or update the corresponding path in `TERRAIN_MOTIFS` before deleting or renaming the SVG. The renderer does not scan folders automatically; its explicit configuration is the source of truth.

## Interaction behaviour

Terrain motifs render in a dedicated SVG layer with `pointer-events: none`. Cell, edge, and point interactions continue to use their existing map geometry and hit targets rather than the artwork itself.
