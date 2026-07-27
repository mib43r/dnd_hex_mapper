# D&D Hex Mapper

A browser-based generator and editor for regional and world-scale hex maps. The map is intended to model not only terrain, but also distance, direction, accessibility, resource distribution, and spheres of influence.

## Proof-of-concept goal

The first version is a standalone website contained in a single `index.html` file. It uses:

- SVG for the hex map and overlays
- Bootstrap for the compact responsive interface
- jQuery for application state and interaction logic
- inline CSS and JavaScript so the POC can be opened directly without a build step

The grid begins with one central hex and expands outward in clockwise spiral order. The POC supports between 1 and 200 cells.

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

## Persistence

The complete map state can be exported as formatted JSON and restored later. The JSON includes:

- grid size and axial cell coordinates
- cell types
- edge features
- corner-point features
- selected overlay origin and travel budget
- schema version for future migrations

## Initial repository structure

```text
README.md   Project scope, rules, data model, and implementation plan
index.html  Complete standalone proof of concept
```

## Planned commits

1. **docs: define hex mapper proof of concept**
   - Document the purpose, terrain model, edge and point features, travel rules, JSON persistence, and implementation plan.

2. **feat: add standalone interactive hex mapper**
   - Add the clockwise spiral SVG grid, cell painting, shared-edge editing, vertex features, weighted travel overlay, and JSON export/import in one self-contained HTML file.

3. **test: add interaction and data-model checks**
   - Add lightweight browser tests for spiral generation, canonical edge and vertex keys, travel-cost calculation, impassable crossings, and JSON round trips.

4. **refactor: separate stable application modules**
   - Only after the POC is validated, optionally split the file into a minimal production structure such as `index.html`, `css/app.css`, and `js/app.js` while preserving a no-build deployment.

5. **feat: expand map modelling**
   - Add multiple simultaneous overlays, labels, editable movement profiles, map pan/zoom, undo/redo, custom icons, and optional PNG/SVG export.

## POC interaction model

- Choose **Cell**, **Edge**, or **Point** editing mode.
- Choose a type and click the corresponding part of the map.
- In edge mode, click near a shared border.
- In point mode, click near a hex corner.
- Select a cell and calculate a travel overlay using a chosen day budget.
- Export the map to JSON or paste exported JSON to restore it.
