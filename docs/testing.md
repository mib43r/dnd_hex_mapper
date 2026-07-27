# Testing

The project uses Playwright for browser-level automated tests while keeping the production application build-free.

## Commands

Install the pinned development dependency:

```bash
npm install
```

Run the test suite:

```bash
npm test
```

Run with a visible browser:

```bash
npm run test:headed
```

The commands are defined in `package.json`.

## Test philosophy

Tests should protect externally visible behaviour and stable data contracts rather than incidental SVG markup or internal object ordering.

New coverage should be added in small, reviewable commits. A test commit should leave the existing suite runnable and should not introduce a production build system.

## Priority coverage

### Grid and topology

Verify:

- centre-first clockwise spiral generation
- unique cell coordinates up to 1,500 cells
- cell-count clamping
- doubled edge-coordinate round trips
- tripled point-coordinate round trips
- six unique edges and six unique points around a cell
- boundary features surviving with one incident cell
- fully external edges and points being pruned

The topology contract is defined in [Coordinate System and Topology](coordinate-system.md).

### Persistence

Verify:

- schema version 4 export shape
- `scaled-axial-v1` coordinate-system marker
- feature grouping by type
- numeric coordinate arrays
- omission of plains
- omission of empty groups where applicable
- omission of selection and influence state
- schema version 4 import/export round trips
- supported schema version 3 migration
- rejection or sanitization of malformed coordinates
- removal of fully external features before export
- preservation of boundary edges and points

The persistence contract is defined in [JSON Schema Version 4](json-schema-v4.md).

### Cell interactions

Verify:

- individual painting and clearing
- Ctrl-click selection toggling
- Ctrl-drag selection
- batch filling and overwriting
- cell-content swapping
- edges and points remaining geographically anchored during swaps

### Edge interactions

Verify:

- individual edge editing and clearing
- inside-edge batch operations
- outside-edge batch operations
- boundary edge editing
- edge features remaining mutually exclusive

### Point interactions

Verify:

- creating towns, toll stations, and points of interest
- replacing one point type with another
- clearing points
- stable identity across rerendering
- boundary point editing

### Movement and influence

Verify:

- normal terrain movement cost
- forest movement cost
- road movement cost
- rivers blocking travel
- water requiring a bridge crossing
- mountains requiring a pass crossing
- all forest, grain, and city sources participating
- overlapping influence layers
- independent visibility toggles
- influence recalculation at startup
- influence recalculation after import and resize
- relevant map edits invalidating previous influence results
- influence state not appearing in exported JSON

### Viewport and rendering

Verify:

- initial rendering
- fit-map behaviour
- button and wheel zoom
- Shift-drag and middle-button panning
- feature rendering at scaled axial coordinates
- a 1,500-cell map rendering within the configured timeout

## Recommended file layout

As coverage grows, keep related cases in focused files:

```text
tests/
  grid.spec.js
  topology.spec.js
  movement.spec.js
  cell-interactions.spec.js
  edge-interactions.spec.js
  point-interactions.spec.js
  influence.spec.js
  persistence.spec.js
  viewport.spec.js
```

This is a target organization, not a guarantee that every file already exists.

## Stable assertions

Prefer assertions against:

- application state exposed intentionally for tests
- exported normalized JSON
- feature counts and identities
- user-visible status text
- semantic classes and `data-*` identifiers

Avoid relying on:

- exact SVG element order unless layer order is the behaviour under test
- formatted JSON whitespace
- object property order
- exact pixel values when scaled axial identity is sufficient
- temporary interaction implementation details

## Normalizing persistence data

Coordinate-array order and object group order are not semantically significant. Persistence tests should normalize data before comparison by:

1. Removing omitted empty groups consistently.
2. Sorting feature-type names.
3. Sorting coordinate arrays lexicographically within each group.
4. Comparing numeric coordinates and feature identities.

Do not compare raw exported JSON strings unless formatting itself is being tested.

## Manual verification checklist

Before merging a change that affects map data or topology, manually confirm:

- a small map loads and is editable
- a 1,500-cell map can be created
- cells can be painted, selected, batch-filled, and swapped
- interior and boundary edges can be edited
- interior and boundary points can be edited
- shrinking the map removes only fully external features
- expanding the map preserves surviving feature identities
- export contains schema version 4 grouped arrays
- plains and influence state are absent from export
- exported JSON imports successfully
- influence overlays are recalculated after import
- zoom, pan, and fit-map still work

## Continuous integration

Browser tests should run for pull requests and may also run for pushes to `main`. The test workflow should remain independent from the GitHub Pages deployment workflow.

A workflow result is authoritative only when it runs against the commit being reviewed. Local test results should be reported separately from connector-based source verification.

## Reporting test status

For each implementation milestone, report:

- tests added or changed
- tests actually run
- pass or failure result
- browser or environment used
- checks not run
- remaining coverage gaps

Never describe planned coverage as already implemented.
