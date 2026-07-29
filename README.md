# D&D Hex Mapper

A browser-based generator and editor for regional and world-scale hex maps. The map is intended to model not only terrain, but also distance, direction, accessibility, resource distribution, and spheres of influence.

## Documentation

- [Terrain asset conventions](docs/terrain-assets.md) — editable SVG format, folder structure, renderer configuration, clipping, and adding or removing motifs.

## Proof-of-concept goal

The current proof of concept is a static website that runs without a build step. It uses:

- SVG for the hex map and overlays
- Bootstrap for the compact responsive interface
- jQuery for application state and interaction logic
- separate readable HTML, CSS, and JavaScript source files

The grid begins with one central hex and expands outward in clockwise spiral order. The POC supports between 1 and 1,500 cells.

The current version is published automatically through GitHub Pages whenever a commit, including a merged pull request, updates the `main` branch.

## Map elements

### Cell types

Each hex can be assigned one primary type:

- plains
- forest
- desert
- water
- mountains
- grain field
- city / large settlement

Assigned terrain is illustrated with deterministic compositions of standalone SVG motifs from `assets/terrain/`. Each motif is an individually editable `64 × 64` SVG that opens visibly in a browser or SVG editor. The configured file paths, motif counts, and scale ranges are defined in `TERRAIN_MOTIFS` in `js/constants.js`.

Terrain artwork is clipped to a geometrically similar inset hexagon. `TERRAIN_RENDER_CONFIG.clipInset` is set to `0.05`, so the clipping polygon uses 95% of the original hex radius and leaves a 5% clear border around the artwork. See [Terrain asset conventions](docs/terrain-assets.md) for the editing workflow and supported SVG format.

### Cell selection and rearrangement

Cell mode supports both individual editing and multi-cell selection:

- A normal click selects one cell and applies the currently chosen cell type.
- Holding **Ctrl** while clicking adds an individual cell to the current selection. Clicking an already selected cell while holding **Ctrl** removes it from the selection.
- Holding **Ctrl** while click-dragging across the map adds every crossed cell to the current selection.
- The **Apply type to selected cells** button fills or overwrites every selected cell with the currently chosen cell type. Choosing **Clear cell** removes the cell characteristics from the entire selection.
- Dragging a cell without holding **Ctrl** starts a cell-content move. Releasing it over another cell swaps the complete cell-level characteristics of the source and destination cells.
- The dragged source cell is highlighted with an orange outline and the current valid destination with a green outline.
- A swap moves cell characteristics such as terrain, grain fields, and cities. Edge features and corner points remain attached to their geographical borders and vertices rather than moving with the cell contents.

Multi-selection can therefore be used for direct batch terrain editing in addition to providing a basis for future grouped overlays, copy-and-paste operations, and moving larger map regions.

### Edge features

A feature can be assigned to the shared edge between two adjacent cells:

- road
- river
- mountain pass
- bridge

Edges affect movement. Roads have a fixed travel cost of `0.5`. Normal terrain costs `1`, while difficult terrain costs `2`. Rivers are barriers, and water or mountain cells are impassable unless the crossing is enabled by a bridge or mountain pass.

Edge mode supports individual and selected-region editing:

- Clicking a shared border applies or clears the currently chosen edge feature on that one border.
- **Apply to inside edges** fills or overwrites every shared edge whose two adjacent cells are both selected.
- **Apply to outside edges** fills or overwrites every existing shared edge that separates a selected cell from an unselected cell.
- Choosing **Clear edge** before using either batch button removes the matching inside or outside edge features.
- The outer boundary of the generated map has no second hex and is therefore not stored as a shared edge.

### Corner points

Specific vertices shared by up to three cells can contain:

- town / small settlement
- toll station
- point of interest

Point mode remains an individual-corner editing tool. No multi-selection batch operation is currently applied to corner points.

## Travel and influence overlays

Forest, grain-field, and city cells act as three independent classes of influence sources. Pressing **Calculate all influences** calculates all three weighted reachability maps simultaneously for the selected travel-day budget.

Every cell of a source type is used as an origin for that type. For example, all grain fields jointly show the total area that can receive grain within the chosen travel budget, while forests and cities calculate their own reach at the same time.

The influence calculation uses accumulated movement cost rather than simple geometric radius. It therefore extends farther along roads, contracts in difficult terrain, and stops at impassable terrain or barriers:

- road edge: `0.5`
- normal traversable terrain: `1`
- forest terrain: `2`
- river edge: impassable
- water cell: impassable without a bridge crossing
- mountain cell: impassable without a mountain-pass crossing

The three influence layers use the corresponding terrain colors from the legend with transparency:

- forest influence uses forest green
- grain influence uses grain yellow
- city influence uses city purple

Each influence class has an independent toggle in the left sidebar. A toggle hides or shows its already calculated overlay without recalculating the other classes.

Reachable cells also display small grouped influence symbols in the top-right area of the hex. A cell can display the forest, grain, and city symbols together when it is reached by all three influence classes.

Changing cell characteristics, swapping cells, changing edge features, or rebuilding the map invalidates the calculated influence data because those changes can alter movement costs or source locations.

## Persistence

The complete map state can be exported as formatted JSON and restored later. The JSON includes:

- grid size and axial cell coordinates
- cell types
- edge features
- corner-point features
- influence travel budget
- enabled or disabled state for the forest, grain, and city influence layers
- whether influence layers had been calculated when the map was exported
- schema version for future migrations

The temporary multi-cell selection is interaction state and is not included in the exported JSON. Cell swaps and batch cell or edge operations modify the persisted map data itself and are therefore preserved in subsequent JSON exports.

Influence reach costs are derived data and are not stored as a large list in the JSON. When an imported map says that influences were calculated, the application recalculates them from the restored cells, edges, budget, and enabled-layer configuration.

The current JSON schema version is `2`. The importer also accepts the earlier single-origin overlay budget and migrates it into the influence budget when possible.

## Repository structure

```text
README.md                          Project scope, controls, limitations, and roadmap
docs/terrain-assets.md             Editable terrain SVG conventions and renderer configuration
assets/terrain/<terrain>/*.svg     Standalone visible 64 × 64 terrain motifs
index.html                         Page structure and ordered stylesheet/script references
css/app.css                        Application layout, map, overlay, and interaction styles
js/constants.js                    Terrain, motif, edge, point, direction, and size definitions
js/state.js                        Application state, validation, migration, and map rebuilding
js/grid.js                         Axial coordinates, spiral generation, geometry, and heap utility
js/interactions.js                 Cell, edge, point, selection, swapping, and batch-edit behavior
js/influence.js                    Movement costs and multi-source influence calculations
js/rendering.js                    SVG rendering, terrain composition, layers, hit targets, legend, and view box
js/persistence.js                  JSON export, import, migration trigger, and clipboard handling
js/app.js                          Event registration, pan/zoom controls, and application startup
.github/workflows/deploy-pages.yml Automatic GitHub Pages deployment from main
```

The application remains build-free. Scripts are loaded in dependency order from `index.html`, with `js/app.js` loaded last. Terrain SVG changes also require no build step: edit an individual motif, save it, and refresh the application.

## Known product limitations

The following limitations are accepted for the current proof of concept and should be treated as planned product work rather than regressions:

- There is no undo or redo history.
- Temporary multi-cell selection is not included in exported JSON.
- Ctrl-based multi-selection has no dedicated touch-screen alternative.
- Point mode supports only individual corner editing and has no batch operations.
- The outer map perimeter is not represented as an editable edge because stored edges require two adjacent cells.
- Forest, grain, and city influence layers currently share one travel-day budget.
- Edge features are mutually exclusive, so a bridge or pass replaces another feature on the same edge instead of forming a layered combination.
- City and grain are primary cell types rather than independent attributes that can coexist with another terrain type.
- Bootstrap and jQuery are loaded from CDNs, so the application is not fully offline.
- There is no PNG or standalone SVG export.
- There are no custom labels, editable movement profiles, or custom icons.
- Large maps up to 1,500 cells are supported, but performance targets and browser-specific limits are not yet formally benchmarked.

## Automated test plan

Automated tests should be added in small reviewable commits. GitHub remains the source of truth, and each milestone should leave a runnable test subset in the repository.

### Proposed test structure

```text
package.json                        Test commands and pinned development dependencies
playwright.config.js                Local static-server and browser-test configuration
tests/
  grid.spec.js                      Spiral generation, coordinates, canonical keys, and size limits
  movement.spec.js                  Movement costs, roads, rivers, bridges, passes, and barriers
  cell-interactions.spec.js         Painting, Ctrl-selection, Ctrl-drag, batch fill, and swapping
  edge-interactions.spec.js         Single-edge editing and inside/outside batch operations
  point-interactions.spec.js        Town, toll, POI, clearing, and shared-corner behavior
  influence.spec.js                 Multi-source reach, overlaps, toggles, symbols, and invalidation
  persistence.spec.js               JSON round trips, schema migration, validation, and recalculation
  viewport.spec.js                  Rendering, 1,500-cell rebuild, zoom, fit, and panning
  terrain-assets.spec.js            Standalone SVG paths, inset clipping, and interaction safety
```

### Planned test commits

1. **test: add browser test foundation**
   - Add `package.json`, pinned Playwright dependency, test commands, and `playwright.config.js`.
   - Start the existing static application through Playwright's local web server configuration.
   - Do not add a build system or production dependency.

2. **test: cover grid and map data utilities**
   - Verify centre-first clockwise spiral generation.
   - Verify unique axial cell IDs through 1,500 cells.
   - Verify canonical shared-edge and corner keys.
   - Verify cell-count clamping and state preservation when rebuilding smaller or larger maps.

3. **test: cover movement and crossing rules**
   - Verify normal, road, forest, bridge, and pass movement costs.
   - Verify rivers block travel.
   - Verify water requires a bridge crossing.
   - Verify mountains require a pass crossing.

4. **test: cover cell editing and selection**
   - Verify normal painting and clearing.
   - Verify Ctrl-click toggles individual selections.
   - Verify Ctrl-drag adds crossed cells.
   - Verify batch fill and overwrite across selected cells.
   - Verify drag-and-drop swaps cell-level characteristics while leaving edges and points geographically anchored.

5. **test: cover edge and point editing**
   - Verify individual edge editing and clearing.
   - Verify inside-edge and outside-edge batch operations.
   - Verify point creation, replacement, and clearing for towns, tolls, and POIs.
   - Verify point mode has no batch operation.

6. **test: cover simultaneous influence overlays**
   - Verify all forest, grain, and city cells act as sources for their corresponding type.
   - Verify the three calculations run from one action and can overlap on the same destination cell.
   - Verify transparent overlays and grouped symbols are rendered for every active influence type.
   - Verify each toggle hides only its own overlay and symbols without recalculating.
   - Verify relevant cell, edge, swap, and rebuild changes invalidate calculated influence data.

7. **test: cover JSON persistence and migration**
   - Verify export/import round trips for cells, edges, points, influence budget, toggle state, and calculated state.
   - Verify temporary multi-selection is intentionally not persisted.
   - Verify derived influence costs are recalculated rather than stored.
   - Verify schema version `1` overlay budgets migrate into schema version `2` influence settings.
   - Verify malformed or out-of-grid data is rejected or sanitized safely.

8. **test: cover viewport and large-map behavior**
   - Verify initial rendering and fit behavior.
   - Verify zoom buttons, wheel zoom, Shift-drag panning, and middle-button panning.
   - Verify a 1,500-cell map renders and remains editable within a documented test timeout.

9. **ci: run browser tests for pull requests**
   - Add a dedicated test workflow only after the local suite is stable.
   - Run on pull requests and pushes to `main`.
   - Keep the existing Pages deployment workflow independent from test execution.

## Implementation commits and roadmap

1. **docs: define hex mapper proof of concept** — completed
   - Document the purpose, terrain model, edge and point features, travel rules, JSON persistence, and implementation plan.

2. **feat: add standalone interactive hex mapper** — completed
   - Add the clockwise spiral SVG grid, cell painting, shared-edge editing, vertex features, weighted travel overlay, and JSON export/import.

3. **ci: deploy main to GitHub Pages** — completed
   - Publish the repository root automatically whenever a commit or merged pull request updates `main`.

4. **feat: add cell multi-selection and swapping** — completed
   - Add Ctrl-click and Ctrl-drag multi-selection, normal drag-and-drop cell-content swapping, interaction highlighting, and preservation of geographically anchored edge and corner features.

5. **feat: support large maps and batch editing** — completed on the feature branch
   - Increase the map limit to 1,500 cells, add batch cell-type application, add inside/outside selected-region edge editing, and reduce inactive SVG hit-target rendering for larger maps.

6. **feat: add simultaneous influence overlays** — completed on the feature branch
   - Calculate forest, grain, and city reach simultaneously from all matching source cells, add independent visibility toggles, transparent legend-colored overlays, grouped influence symbols, and JSON schema migration.

7. **refactor: separate stable application modules** — completed on the feature branch
   - Split the application into readable HTML, CSS, state, grid, interaction, influence, rendering, persistence, and startup modules while preserving build-free deployment.

8. **test: add maintained automated coverage** — planned
   - Implement the staged browser-test commits described in the automated test plan.

9. **feat: address known product limitations** — planned
   - Prioritize undo/redo, touch-friendly selection, layered map attributes, separate influence budgets, export formats, labels, and editable movement profiles.

## POC interaction model

- Choose **Cell**, **Edge**, or **Point** editing mode.
- Choose a type and click the corresponding part of the map.
- In cell mode, click a hex to apply the chosen terrain and make it the active cell.
- Hold **Ctrl** and click individual hexes to add or remove them from a multi-selection.
- Hold **Ctrl** and drag across several hexes to add each crossed cell to the selection.
- Use **Apply type to selected cells** to fill, overwrite, or clear all selected cells.
- Drag a hex without **Ctrl** and release it over another hex to swap their cell-level characteristics.
- Switch to edge mode and use **Apply to inside edges** to edit borders between selected cells.
- In edge mode, use **Apply to outside edges** to edit borders between selected and unselected cells.
- In edge mode, click near one shared border to edit only that edge.
- In point mode, click near a hex corner to edit one point feature.
- Enter a travel-day budget and press **Calculate all influences** to calculate forest, grain, and city reach simultaneously.
- Toggle the three influence switches to show or hide each calculated layer independently.
- Use **Shift-drag** or the middle mouse button to pan the map without moving cell contents.
- Export the map to JSON or paste exported JSON to restore it.

## Deployment

The GitHub Pages workflow is stored in `.github/workflows/deploy-pages.yml`. It runs on every push to `main`, including the commit created when a pull request is merged, and can also be started manually from the GitHub Actions interface.

Changes committed only to a feature branch are not deployed to the public Pages site until that branch is manually merged into `main`.

The expected published site is:

```text
https://mib43r.github.io/dnd_hex_mapper/
```
