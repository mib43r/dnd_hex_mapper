# Architecture

The D&D Hex Mapper is a build-free browser application organized into small JavaScript files loaded directly by `index.html`.

## Design goals

The architecture favors readable source, stable topology identities, compact persistence, derived rendering and influence state, and small reviewable changes.

## Runtime flow

```text
User input
   ↓
Interactions and application events
   ↓
State mutation and validation
   ↓
Influence invalidation or recalculation
   ↓
SVG rendering and status updates
   ↓
Optional JSON export
```

Import follows the reverse data path:

```text
JSON input
   ↓
Schema validation and compatibility migration
   ↓
State normalization and topology pruning
   ↓
Influence recalculation
   ↓
SVG rendering
```

## Module responsibilities

### `js/constants.js`

Defines shared geometry constants, map limits, axial directions, feature definitions, influence source types, and the minimum-heap utility.

### `js/state.js`

Owns application state and lifecycle behavior:

- initial state creation
- schema version selection
- cell-count clamping
- import sanitization and compatibility migration
- map rebuilds while preserving valid data
- pruning cells and fully external topology features
- invalidating derived influence state

Topology cleanup is centralized here so rendering and persistence do not implement conflicting boundary rules.

### `js/grid.js`

Defines coordinate, topology, and geometry helpers:

- axial cell IDs and parsing
- clockwise spiral generation
- axial-to-pixel conversion
- doubled edge identities and incident-cell reconstruction
- tripled point identities and incident-cell reconstruction
- SVG polygon geometry

These helpers are authoritative for map identity. SVG pixels are derived presentation data. See [Coordinate System and Topology](coordinate-system.md).

### `js/interactions.js`

Implements direct editing behavior:

- active-cell and multi-cell selection
- painting, clearing, and batch cell edits
- Ctrl-click and Ctrl-drag selection
- cell-content swapping
- individual and batch edge editing
- individual point editing
- pointer gestures
- influence invalidation after relevant edits

### `js/influence.js`

Implements weighted multi-source reach for forest, grain, and city influence.

Movement resolves an edge through the same doubled scaled-axial identity used by editing and persistence: the two traversed cell IDs are parsed as axial cells and passed to `edgeKeyFromCells`. This keeps road, river, bridge, and pass lookup independent of cell order and SVG geometry.

Each influence type has its own reach budget and terrain-cost profile. Edge behavior remains fixed: roads cost `0.5`, rivers block movement, bridges allow water crossings, and passes allow mountain crossings.

Influence costs and reachability are derived state. They are recalculated rather than exported in schema version 4.

### `js/rendering.js`

Builds the SVG representation from state:

- terrain cells and labels
- influence overlays and markers
- currently supported edge rendering and hit targets
- point rendering and hit targets
- selection and drag feedback
- viewport fitting, zoom, and pan
- terrain legend

Rendering consumes topology identities; it must not create authoritative identities from rounded pixel positions.

### `js/persistence.js`

Handles JSON export, import, normalization, compatibility migration, influence recalculation after import, and clipboard copying. See [JSON Schema Version 4](json-schema-v4.md).

### `js/app.js`

Registers UI events and coordinates editing modes, map rebuilds, influence controls, persistence actions, viewport controls, and startup.

### `index.html`

Defines the application controls and ordered stylesheet and script references. Script order is significant because the project uses no bundler or module loader; `js/app.js` is loaded last.

### `css/app.css`

Defines layout and presentation. CSS classes do not define map-data identity.

## State categories

### Persisted map state

Schema version 4 persists:

- `cellCount`
- non-default cell types
- edge feature types and scaled-axial identities
- point feature types and scaled-axial identities

### Compatibility input

The importer may read supported fields from earlier formats, including compatible influence budgets and terrain multipliers. These fields are migration input, not part of the schema version 4 export contract.

### Derived state

Derived state includes generated cells, pixel geometry, influence costs, reachability, and SVG elements. It can be regenerated from persisted map data and current application settings.

### Interaction state

Active selection, multi-selection, gestures, editing mode, zoom, pan, and hit targets are temporary and are not exported.

## Data invariants

1. `cellCount` remains between `1` and `1500`.
2. Stored non-default cells must exist in the generated spiral.
3. Edge and point identities use scaled-axial topology, not pixels.
4. Features with no incident existing cells are fully external and are removed during normalization/export.
5. Plains are represented by absence from `state.cells`.
6. Influence reach is derived and recalculable.
7. New exports use schema version `4` and `scaled-axial-v1`.

## Change guidance

- Preserve existing interaction behavior unless a change explicitly targets it.
- Keep topology rules in `grid.js` and lifecycle cleanup in `state.js`.
- Avoid duplicating import/export rules outside persistence and state sanitization.
- Do not persist rendered coordinates.
- Invalidate influence after movement-affecting edits.
- Prefer small commits and focused normal-case tests.

Testing guidance is documented in [Testing](testing.md).
