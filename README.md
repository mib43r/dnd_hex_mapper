# D&D Hex Mapper

A browser-based generator and editor for regional and world-scale hex maps. The map is intended to model not only terrain, but also distance, direction, accessibility, resource distribution, and spheres of influence.

## Proof-of-concept goal

The first version is a standalone website contained in a single `index.html` file. It uses:

- SVG for the hex map and overlays
- Bootstrap for the compact responsive interface
- jQuery for application state and interaction logic
- inline CSS and JavaScript so the POC can be opened directly without a build step

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

## Initial repository structure

```text
README.md                          Project scope, rules, data model, and implementation plan
index.html                         Complete standalone proof of concept
.github/workflows/deploy-pages.yml Automatic GitHub Pages deployment from main
```

## Implementation commits and roadmap

1. **docs: define hex mapper proof of concept** — completed
   - Document the purpose, terrain model, edge and point features, travel rules, JSON persistence, and implementation plan.

2. **feat: add standalone interactive hex mapper** — completed
   - Add the clockwise spiral SVG grid, cell painting, shared-edge editing, vertex features, weighted travel overlay, and JSON export/import in one self-contained HTML file.

3. **ci: deploy main to GitHub Pages** — completed
   - Publish the repository root automatically whenever a commit or merged pull request updates `main`.

4. **feat: add cell multi-selection and swapping** — completed
   - Add Ctrl-click and Ctrl-drag multi-selection, normal drag-and-drop cell-content swapping, interaction highlighting, and preservation of geographically anchored edge and corner features.

5. **feat: support large maps and batch editing** — completed on the feature branch
   - Increase the map limit to 1,500 cells, add batch cell-type application, add inside/outside selected-region edge editing, and reduce inactive SVG hit-target rendering for larger maps.

6. **feat: add simultaneous influence overlays** — completed on the feature branch
   - Calculate forest, grain, and city reach simultaneously from all matching source cells, add independent visibility toggles, transparent legend-colored overlays, grouped influence symbols, and JSON schema migration.

7. **test: add interaction and data-model checks** — planned
   - Add maintained browser tests for spiral generation, canonical edge and vertex keys, travel-cost calculation, impassable crossings, JSON round trips, multi-selection gestures, batch cell and edge editing, cell swapping, and simultaneous influence layers.

8. **refactor: separate stable application modules** — planned
   - Only after the POC is validated, optionally split the file into a minimal production structure such as `index.html`, `css/app.css`, and `js/app.js` while preserving a no-build deployment.

9. **feat: expand map modelling** — planned
   - Add labels, editable movement profiles, undo/redo, custom icons, optional PNG/SVG export, additional resource classes, and more operations for selected cells.

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
