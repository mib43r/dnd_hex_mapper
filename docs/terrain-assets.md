# Terrain asset conventions

Terrain artwork is stored as standalone motif files under `assets/terrain/`. The renderer supports directly referenced SVG files and transparent PNG files.

The current library is transitional:

- mountain motifs already use the new illustrated transparent PNG direction;
- plains, forest, desert, water, grain, and city still use the earlier SVG motifs;
- the remaining terrain categories are intended to migrate to illustrated PNG motifs as their visual concepts are approved and generated.

This document describes both the current mixed-format state and the intended shared art direction. It does not imply that the remaining SVG assets have already been replaced.

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

The configured file paths are listed explicitly in `TERRAIN_MOTIFS` in `js/constants.js`. The renderer does not scan the folders automatically.

## Shared illustrated art direction

The target motif library should feel like one coherent fantasy-map illustration set rather than unrelated icons. Terrain categories may use distinct palettes and shapes, but they should share the following principles:

- transparent backgrounds with no scenery outside the motif;
- compact, readable silhouettes designed for repeated composition inside a hex;
- dark, slightly warm contours rather than harsh pure black where practical;
- broad flat or lightly textured tonal planes instead of gradients or photorealistic lighting;
- sparse internal ridge, hatch, grain, ripple, bark, masonry, or vegetation marks;
- asymmetry and hand-drawn irregularity without becoming visually noisy;
- enough transparent margin to survive rotation and clipping;
- strong readability at the renderer's small display sizes;
- consistent apparent line weight and detail density across terrain categories.

The mountain work establishes the general reference language: old-map contour drawing, restrained colours, simplified value planes, off-white highlights, and selective fine detail. Other terrains should adapt that language to their own materials rather than copying mountain colours literally.

## Transparent PNG target format

New illustrated motifs should normally be delivered as high-resolution transparent PNG files. Use a consistent square source canvas for a terrain set, preferably at least `512 × 512`; `1024 × 1024` is suitable for concept generation and archival source output before repository optimisation.

Repository PNG files should:

- retain true alpha transparency;
- keep the artwork centred with clear space around the silhouette;
- avoid checkerboard patterns baked into the image;
- avoid external drop shadows, labels, borders, sky, ground rectangles, or unrelated scenery;
- use lowercase, hyphenated names such as `tree-3.png`, `dune-2.png`, or `house-1.png`;
- remain readable when rendered substantially smaller than the source image;
- preserve a limited terrain-specific palette;
- be palette-optimised or otherwise compressed without visible degradation at map scale.

Source generation may use a larger working image, but the committed assets should use one consistent final dimension within each terrain family. Do not mix arbitrary dimensions within a single category.

## Existing SVG format

Until a category is migrated, its existing SVG motifs should continue to:

- use `viewBox="0 0 64 64"`;
- contain visible artwork directly inside the root `<svg>` element;
- open visibly in a browser or SVG editor without application CSS;
- keep transparent areas transparent;
- avoid scripts, embedded raster images, external stylesheets, fonts, and filters;
- use simple paths, shapes, fills, and strokes that remain legible at small sizes.

The legacy monochrome colour is `#2F302B`. White interior cut-outs may use `#fff`. Existing SVGs should not be redesigned merely to imitate the future PNG style if the category is scheduled for replacement.

## Terrain-specific palette guidance

Each terrain should use a restrained palette with approximately four to six functional colours:

- a warm near-black contour;
- one dominant local colour;
- one darker shadow colour;
- one lighter highlight colour;
- optional secondary material or accent colours;
- off-white only where it represents foam, pale stone, sunlit surfaces, flowers, plaster, or another intentional material.

Avoid highly saturated colours. Motifs should remain compatible with the cell background fills and should not rely on the background colour to complete the drawing.

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

Because motifs may be rotated, the important artwork should not touch the source canvas edges. Long horizontal features such as ridges, roads, fields, walls, or shorelines need additional transparent margin at their corners.

## Editing a motif

For existing SVG motifs, open the file in an SVG editor or text editor, keep the `64 × 64` view box, save it in place, and refresh the application.

For illustrated PNG motifs, edit the high-resolution artwork in a raster editor or regenerate the approved concept, export a centred transparent PNG at the category's chosen final dimension, replace the file in place, and refresh the application.

There is no build or asset-compilation step.

## Migrating a terrain category

Migrate one terrain category at a time so its visual language can be reviewed before affecting the full library.

1. Review the configured filenames and define one distinct concept for each motif.
2. Agree on a category palette, contour treatment, apparent scale, and detail density.
3. Generate or draw the complete category as a visually coherent set.
4. Verify true transparency and consistent canvas dimensions.
5. Replace the category files and update its paths in `TERRAIN_MOTIFS`.
6. Check compositions at normal and zoomed-out map scale.
7. Update documentation only where the implemented state has changed.
8. Run the minimal Playwright suite.

Do not replace files with placeholders merely to complete a migration. A category should remain on its existing SVGs until the full PNG set is approved.

## Adding a motif

1. Add a standalone SVG for an unmigrated category or an approved transparent PNG for an illustrated category.
2. Add its repository-relative path to that terrain's `files` array in `TERRAIN_MOTIFS`.
3. Keep the file name lowercase and hyphenated.
4. Match the format, dimensions, palette, and visual language of the other motifs in that category.
5. Open the application and verify that the motif appears at small map scale.
6. Run the minimal Playwright suite.

## Removing or renaming a motif

Remove or update the corresponding path in `TERRAIN_MOTIFS` before deleting or renaming the asset. The renderer does not scan folders automatically; its explicit configuration is the source of truth.

## Interaction behaviour

Terrain motifs render in a dedicated SVG layer with `pointer-events: none`. Cell, edge, and point interactions continue to use their existing map geometry and hit targets rather than the artwork itself.
