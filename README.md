# D&D Hex Mapper

A browser-based generator and editor for regional and world-scale hex maps. The map is intended to model not only terrain, but also distance, direction, accessibility, resource distribution, and spheres of influence.

## Proof-of-concept goal

The first version is a standalone website contained in a single `index.html` file. It uses:

- SVG for the hex map and overlays
- Bootstrap for the compact responsive interface
- jQuery for application state and interaction logic
- inline CSS and JavaScript so the POC can be opened directly without a build step

The grid begins with one central hex and expands outward in clockwise spiral order. The POC supports between 1 and 200 cells.

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
- Dragging a cell without holding **Ctrl** starts a cell-content move. Releasing it over another cell swaps the complete cell-level characteristics of the source and destination cells.
- The dragged source cell is highlighted with an orange outline and the current valid destination with a green outline.
- A swap moves cell characteristics such as terrain, grain fields, and cities. Edge features and corner points remain attached to their geographical borders and vertices rather than moving with the cell contents.

Multi-selection provides the basis for later batch editing, grouped overlays, copy-and-paste operations, and moving larger map regions. In the current POC, it is used for selection only; terrain is still applied through a normal individual click.

### Edge features

A feature can be assigned to the shared edge between two adjacent cells:

- road
- river
- mountain pass
- bridge

Edges affect movement. Roads have a fixed travel cost of `0.5`. Normal terrain costs `1`, while difficult terrain costs `2`. Rivers are barriers, and water or mountain cells are impassable unless the crossing is enabled by a bridge or mountain pass.

### Corner points

Specific vertices shared by up to three cells can contain:

- town / small settlement
- toll station
- point of interest

## Travel and influence overlays

A selected cell can act as an origin for a weighted reachability overlay. For example, a grain field with a three-day travel budget can show how far grain can be distributed.

The overlay uses accumulated movement cost rather than simple geometric radius. It therefore extends farther along roads, contracts in difficult terrain, and stops at impassable terrain or barriers. The same mechanic can later represent trade, military control, political influence, communication, services, or other resources.

The most recently active cell in a multi-selection becomes the active overlay origin. Swapping cell contents clears the currently calculated overlay because the underlying movement costs may have changed.

## Persistence

The complete map state can be exported as formatted JSON and restored later. The JSON includes:

- grid size and axial cell coordinates
- cell types
- edge features
- corner-point features
- selected overlay origin and travel budget
- schema version for future migrations

The temporary multi-cell selection is currently interaction state and is not included in the exported JSON. Cell swaps modify the persisted cell data itself and are therefore preserved in subsequent JSON exports.

## Initial repository structure

```text
README.md                         Project scope, rules, data model, and implementation plan
index.html                        Complete standalone proof of concept
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

5. **test: add interaction and data-model checks** — planned
   - Add lightweight browser tests for spiral generation, canonical edge and vertex keys, travel-cost calculation, impassable crossings, JSON round trips, multi-selection gestures, and cell swapping.

6. **refactor: separate stable application modules** — planned
   - Only after the POC is validated, optionally split the file into a minimal production structure such as `index.html`, `css/app.css`, and `js/app.js` while preserving a no-build deployment.

7. **feat: expand map modelling** — planned
   - Add multiple simultaneous overlays, labels, editable movement profiles, map pan/zoom, undo/redo, custom icons, optional PNG/SVG export, and batch operations for selected cells.

## POC interaction model

- Choose **Cell**, **Edge**, or **Point** editing mode.
- Choose a type and click the corresponding part of the map.
- In cell mode, click a hex to apply the chosen terrain and make it the active overlay origin.
- Hold **Ctrl** and click individual hexes to add or remove them from a multi-selection.
- Hold **Ctrl** and drag across several hexes to add each crossed cell to the selection.
- Drag a hex without **Ctrl** and release it over another hex to swap their cell-level characteristics.
- Use **Shift-drag** or the middle mouse button to pan the map without moving cell contents.
- In edge mode, click near a shared border.
- In point mode, click near a hex corner.
- Select a cell and calculate a travel overlay using a chosen day budget.
- Export the map to JSON or paste exported JSON to restore it.

## Deployment

The GitHub Pages workflow is stored in `.github/workflows/deploy-pages.yml`. It runs on every push to `main`, including the commit created when a pull request is merged, and can also be started manually from the GitHub Actions interface.

The expected published site is:

```text
https://mib43r.github.io/dnd_hex_mapper/
```
