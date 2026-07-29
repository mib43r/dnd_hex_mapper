# Terrain asset conventions

Terrain artwork is stored as standalone motif files under `assets/terrain/`. Most terrain motifs are directly editable SVGs. Mountain motifs use transparent PNG files so their more detailed illustrated style can be preserved.

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
assets/terrain/mountains/peak-2.png
assets/terrain/city/tower-1.svg
```

The configured file paths are listed explicitly in `TERRAIN_MOTIFS` in `js/constants.js`.

## SVG format

SVG motifs should:

- use `viewBox="0 0 64 64"`;
- contain visible artwork directly inside the root `<svg>` element;
- open visibly in a browser or SVG editor without application CSS;
- use `#2F302B` for monochrome artwork unless a terrain-specific palette is documented;
- keep transparent areas transparent;
- avoid scripts, embedded raster images, external stylesheets, fonts, and filters;
- use simple paths, shapes, fills, and strokes that remain legible at small sizes.

White interior cut-outs may use `#fff` where they are part of the intended motif design.

## PNG mountain format

Mountain motifs are `256 × 256` transparent PNG files. They use a limited beige, grey, off-white, and dark-contour palette. The files should:

- retain a transparent background;
- keep the artwork centred with clear space around the silhouette;
- avoid external shadows or scenery outside the motif;
- remain readable when rendered substantially smaller than their source resolution;
- use lowercase, hyphenated names such as `peak-1.png` or `ridge-2.png`.

The PNGs are palette-optimised to keep repository size small while preserving the illustrated appearance.

## Composition and clipping

The renderer selects motifs deterministically from the configured files. A cell therefore keeps the same composition across rerenders as long as its coordinate and terrain type do not change.

For every placed motif, the renderer varies:

- selected file;
- position around a fixed set of anchors;
- scale within the terrain's configured range;
- rotation by a small amount.

SVG files render through SVG `use` elements. PNG files render through SVG `image` elements. Both formats share the same deterministic placement and clipping behaviour.

Motifs are clipped to a smaller hexagon controlled by:

```js
const TERRAIN_RENDER_CONFIG = {
  clipInset: 0.05
};
```

`clipInset` is a fraction of the original hexagon radius. A value of `0.05` creates a clipping polygon at `0.95` scale, leaving a 5% clear border around the terrain artwork. The inset polygon is geometrically similar to the original hexagon.

## Editing a motif

For SVG motifs, open the file in an SVG editor or text editor, keep the `64 × 64` view box, save it in place, and refresh the application.

For PNG mountain motifs, edit the high-resolution artwork in a raster editor, export a centred `256 × 256` transparent PNG, replace the file in place, and refresh the application.

There is no build or asset-compilation step.

## Adding a motif

1. Add a standalone SVG or supported transparent PNG to the appropriate terrain folder.
2. Add its repository-relative path to that terrain's `files` array in `TERRAIN_MOTIFS`.
3. Keep the file name lowercase and hyphenated.
4. Open the application and verify that the motif appears at small map scale.
5. Run the minimal Playwright suite.

## Removing or renaming a motif

Remove or update the corresponding path in `TERRAIN_MOTIFS` before deleting or renaming the asset. The renderer does not scan folders automatically; its explicit configuration is the source of truth.

## Interaction behaviour

Terrain motifs render in a dedicated SVG layer with `pointer-events: none`. Cell, edge, and point interactions continue to use their existing map geometry and hit targets rather than the artwork itself.
