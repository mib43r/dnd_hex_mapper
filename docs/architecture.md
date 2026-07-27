# Architecture

The D&D Hex Mapper is a build-free browser application organized into small JavaScript modules loaded directly by `index.html`.

## Design goals

The architecture favors:

- readable source files
- stable map-data identities independent of SVG pixels
- explicit module responsibilities
- derived rendering and influence state
- compact persistence
- straightforward browser deployment
- small, reviewable changes

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
Schema validation and migration
   ↓
State normalization and topology pruning
   ↓
Influence recalculation
   ↓
SVG rendering
```

## Module responsibilities

### `js/constants.js`

Defines values shared across modules:

- hex geometry constants
- maximum map size
- axial neighbor directions
- cell feature definitions
- edge feature definitions
- point feature definitions
- influence source types
- the minimum-heap utility used by weighted traversal

This module should contain stable definitions rather than mutable application state.

### `js/state.js`

Owns the main application state and its lifecycle.

Responsibilities include:

- initial state creation
- schema version selection
- cell-count clamping
- import migration into the current state model
- map rebuilds while preserving valid data
- pruning cells outside the generated map
- pruning only fully external edges and points
- resetting or invalidating derived influence state

Topology cleanup is centralized here so rendering and persistence do not implement conflicting boundary rules.

### `js/grid.js`

Defines coordinate, topology, and geometry helpers.

Responsibilities include:

- axial cell IDs and parsing
- clockwise spiral generation
- axial-to-pixel conversion
- scaled axial coordinate conversion
- doubled edge midpoint identities
- reconstruction of incident edge cells
- tripled point vertex identities
- reconstruction of incident point cells
- SVG polygon-point generation
- generic SVG element creation

The coordinate helpers are authoritative for feature identity. Rendering pixels are derived from them.

See [Coordinate System and Topology](coordinate-system.md).

### `js/interactions.js`

Implements direct editing behaviour.

Responsibilities include:

- active-cell and multi-cell selection
- cell painting and clearing
- Ctrl-click and Ctrl-drag selection
- cell-content swapping
- individual edge editing
- inside/outside edge batch operations
- individual point editing
- pointer gesture handling
- influence invalidation after relevant edits

Interactions mutate state through stable cell, edge, and point identities. They do not treat SVG pixel positions as persistent feature keys.

### `js/influence.js`

Implements weighted reach calculations.

Responsibilities include:

- reading influence controls
- movement cost evaluation
- road, river, bridge, and pass crossing rules
- multi-source traversal for forest, grain, and city
- independent influence visibility
- influence invalidation
- influence summaries

Influence is derived state. It is not part of schema version 4 persistence.

### `js/rendering.js`

Builds the SVG representation from current state.

Responsibilities include:

- generating the current spiral cell list
- rendering terrain cells and labels
- rendering influence overlays and markers
- rendering edges from doubled axial midpoint identities
- rendering points from tripled axial vertex identities
- creating mode-specific hit targets
- showing selection and drag states
- fitting and applying the SVG view box
- rendering the terrain legend

Rendering must not create new authoritative map identities. It consumes identities from state and topology helpers.

### `js/persistence.js`

Handles user-facing JSON operations.

Responsibilities include:

- normalizing and pruning state before export
- creating grouped schema version 4 objects
- formatting JSON for the interface
- reading and parsing imported JSON
- invoking state migration and sanitization
- recalculating influence after import
- clipboard copying

See [JSON Schema Version 4](json-schema-v4.md).

### `js/app.js`

Connects the modules to the page.

Responsibilities include:

- registering UI event handlers
- switching editing modes
- rebuilding the map from the cell-count control
- triggering influence calculation
- clearing and toggling influence overlays
- triggering import, export, and clipboard actions
- zoom, pan, and fit-map controls
- startup rendering and influence calculation

This file should remain focused on orchestration rather than topology or persistence rules.

### `index.html`

Defines:

- application controls
- map container
- status and legend elements
- stylesheet references
- ordered script references

The script order is significant because the project does not use a bundler or module loader. `js/app.js` is loaded last.

### `css/app.css`

Defines:

- responsive layout
- SVG map appearance
- terrain and feature styles
- influence overlays and markers
- editing hit targets
- selection and drag feedback

CSS classes describe presentation, not map-data identity.

## State categories

### Persisted map state

Schema version 4 persists:

- `cellCount`
- non-default cell types
- edge feature types and scaled axial identities
- point feature types and scaled axial identities

### Derived state

Derived state can be regenerated from persisted map data:

- generated spiral cells
- cell pixel positions
- polygon vertices
- edge line endpoints
- point pixel positions
- influence costs and reachability
- SVG elements

### Interaction state

Temporary interaction state is not persisted:

- active cell
- multi-cell selection
- drag gesture data
- current editing mode
- pan and zoom
- rendered hit targets

Keeping these categories separate prevents exports from accumulating transient UI details.

## Data invariants

The application should maintain these invariants:

1. `cellCount` is between `1` and `1500`.
2. A stored non-default cell exists in the generated spiral.
3. An edge identity reconstructs valid adjacent cells.
4. An edge is retained when at least one incident cell exists.
5. A point identity reconstructs a valid hex vertex.
6. A point is retained when at least one incident cell exists.
7. Fully external features are neither rendered nor exported.
8. Plains are represented by absence from `state.cells`.
9. Influence data is treated as derived and recalculable.
10. New exports use schema version 4 and `scaled-axial-v1`.

## Change guidance

When changing one subsystem:

- preserve public interaction behaviour unless the change explicitly targets it
- keep topology rules in `grid.js` and lifecycle cleanup in `state.js`
- avoid duplicating import/export rules outside `persistence.js`
- avoid persisting rendered coordinates
- invalidate influence after movement-affecting edits
- add or update focused tests for the stable contract
- use small commits, preferably one coherent file or concern per commit

Testing guidance is documented in [Testing](testing.md).
