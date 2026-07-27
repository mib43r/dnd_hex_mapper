# D&D Hex Mapper

A browser-based editor for regional and world-scale hex maps. It models terrain, movement, settlements, infrastructure, and overlapping spheres of influence without requiring a build step.

## Contents

- [Overview](#overview)
- [Features](#features)
- [Quick start](#quick-start)
- [Controls](#controls)
- [Export and import](#export-and-import)
- [Development](#development)
- [Repository structure](#repository-structure)
- [Documentation](#documentation)
- [Known limitations](#known-limitations)
- [Roadmap](#roadmap)

## Overview

The map starts with one central hex and expands outward in clockwise spiral order. Maps can contain between 1 and 1,500 cells.

The project is a static website using:

- SVG for the map and overlays
- Bootstrap for the responsive interface
- jQuery for interaction and application state
- separate readable HTML, CSS, and JavaScript modules

Changes merged into `main` are published through GitHub Pages.

## Features

### Cells

Each hex has one primary type:

- plains
- forest
- desert
- water
- mountains
- grain field
- city

Plains are the default and are omitted from exported map data.

### Edges

Map borders can contain roads, rivers, mountain passes, and bridges.

Edges remain geographically anchored when cell contents are swapped. Interior shared edges are rendered and editable. The topology and persistence model also retain one-cell boundary edges, but direct boundary-edge rendering and editing are not yet fully implemented. Edges with no incident grid cell are invalid and are removed during normalization or export.

### Points

Hex vertices can contain towns, toll stations, and points of interest.

Points use stable scaled-axial vertex identities rather than rounded screen coordinates. Boundary points remain valid while at least one incident cell exists.

### Influence overlays

Forest, grain, and city cells act as independent influence sources. Each influence type has its own reach budget and terrain-cost profile.

Road, river, bridge, and mountain-pass behavior remains fixed. Influence traversal resolves edge features through the same scaled-axial edge identity used by editing and persistence.

Influence reach is derived state. It is recalculated at startup, after import, after map resizing, and when the user presses **Calculate all influences**. New schema version 4 exports omit influence settings and calculated results, although the importer may read compatible settings from earlier input.

## Quick start

Open `index.html` in a browser, or serve the repository root with any static web server.

The repository declares Playwright and reserves these commands:

```bash
npm install
npm test
npm run test:headed
```

The browser configuration and maintained test files are still minimal or incomplete. See [Testing](docs/testing.md) before treating `npm test` as a complete regression suite.

No production build step is required.

## Controls

### Cell mode

- Click a hex to apply the selected cell type.
- Hold **Ctrl** while clicking to add or remove individual cells from the selection.
- Hold **Ctrl** while dragging to add crossed cells to the selection.
- Use **Apply type to selected cells** for batch editing.
- Drag one cell onto another without **Ctrl** to swap their cell-level contents.

### Edge mode

- Click a currently rendered edge to apply or clear the selected edge feature.
- Use **Apply to inside edges** for borders between selected cells.
- Use **Apply to outside edges** for borders between selected and unselected generated cells.

### Point mode

- Click a hex corner to apply or clear the selected point feature.

### Viewport

- Use the zoom buttons or mouse wheel to zoom.
- Hold **Shift** and drag, or use the middle mouse button, to pan.
- Use **Fit map** to reset the viewport.

## Export and import

Map data is exported as schema version `4` using grouped feature types and numeric scaled-axial coordinates.

The export includes:

- `schemaVersion`
- `coordinateSystem`
- `cellCount`
- non-default cells grouped by type
- edges grouped by type
- points grouped by type

The export intentionally omits:

- plains cells
- temporary selections
- the active cell
- viewport state
- influence settings and calculated influence data

Before export, cells outside the map are removed. Edges and points are removed when none of their incident cells exists. Compatible influence settings may be read during migration but are not part of the schema version 4 export contract.

See the [JSON schema reference](docs/json-schema-v4.md) and [coordinate system reference](docs/coordinate-system.md).

## Development

The application remains build-free. Scripts are loaded in dependency order from `index.html`, with `js/app.js` loaded last.

Playwright is intended as a deliberately small browser-level regression layer for representative normal workflows. It should not introduce a build system or become more complicated than the application it verifies. Current status and intended coverage are documented in [Testing](docs/testing.md).

## Repository structure

```text
README.md                          Project overview and entry points
docs/architecture.md              Module responsibilities and data flow
docs/coordinate-system.md         Cell, edge, and point topology
docs/json-schema-v4.md            Persistence schema and migration rules
docs/testing.md                   Minimal Playwright intent and verification guidance
index.html                         Page structure and script references
css/app.css                        Layout, map, overlay, and interaction styles
js/constants.js                    Feature definitions and limits
js/state.js                        State, validation, migration, and pruning
js/grid.js                         Axial coordinates, topology, and geometry
js/interactions.js                 Editing and selection behavior
js/influence.js                    Movement and influence calculations
js/rendering.js                    SVG rendering and viewport handling
js/persistence.js                  JSON export, import, and clipboard handling
js/app.js                          Event registration and startup
```

## Documentation

- [Architecture](docs/architecture.md) — application modules and data flow
- [Coordinate system](docs/coordinate-system.md) — scaled-axial cell, edge, and point identities
- [JSON schema version 4](docs/json-schema-v4.md) — compact map persistence format
- [Testing](docs/testing.md) — minimal Playwright scope and current setup status

## Known limitations

- There is no undo or redo history.
- Ctrl-based multi-selection has no dedicated touch-screen alternative.
- Direct rendering and editing of one-cell boundary edges are not yet complete.
- Point mode supports only individual corner editing.
- Edge features are mutually exclusive rather than layered.
- Terrain movement costs are editable per influence type, but edge movement rules remain fixed.
- City and grain are primary cell types rather than independent attributes.
- Bootstrap and jQuery are loaded from CDNs.
- There is no PNG or standalone SVG export.
- There are no custom labels or custom icons.
- Large-map performance has not yet been formally benchmarked across browsers.
- The Playwright setup is intentionally minimal and does not yet provide broad automated coverage.

## Roadmap

Current priorities are:

1. Add a small maintained Playwright suite for representative normal workflows.
2. Complete boundary-edge rendering and editing without creating outside grid cells.
3. Add undo and redo.
4. Improve touch-friendly selection and editing.
5. Support layered cell and edge attributes.
6. Add image and standalone SVG export.
7. Add custom labels and icons.
