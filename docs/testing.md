# Testing

The project declares Playwright as its browser-level regression tool while keeping the production application build-free.

## Current status

The repository currently contains:

- a pinned `@playwright/test` development dependency
- `npm test`
- `npm run test:headed`

The Playwright browser configuration and maintained test files are still minimal or incomplete. There is no promise of broad automated coverage yet, and the npm commands should not be treated as a mature regression suite until focused tests are added.

## Intended role

Playwright should open the real static application in a browser and verify a small number of representative normal user workflows.

It is intended to catch obvious integration regressions between:

- application state
- editing interactions
- topology identities
- SVG rendering
- influence calculation
- JSON persistence

The test setup should remain smaller and simpler than the application itself.

## Explicit non-goals

The Playwright layer should not:

- introduce a production build system
- create a large custom test framework
- require databases, services, generated fixtures, or elaborate helpers
- duplicate every internal JavaScript function with browser assertions
- depend heavily on incidental SVG child order or styling details
- exhaustively test malformed input combinations
- become a performance-benchmarking platform
- add CI complexity before the local suite is stable

Additional tests should be added only when they protect clear user behavior or a stable data contract.

## Reserved commands

Install the pinned development dependency:

```bash
npm install
```

Run the configured Playwright command:

```bash
npm test
```

Run with a visible browser:

```bash
npm run test:headed
```

Until configuration and test files are committed, these commands may report that no tests are available.

## Minimal first suite

The initial maintained suite should cover ordinary happy paths only.

### 1. Application startup

- open the static application
- confirm the default map is visible
- confirm there are no startup JavaScript errors

### 2. Cell editing

- choose a terrain type
- paint one generated cell
- confirm the visible terrain changes

### 3. Interior edge editing

- select road
- apply it to one rendered interior edge
- confirm the road is visible

Boundary-edge editing should not be claimed as covered until that implementation exists.

### 4. Point editing

- add one point feature to a visible corner
- confirm it renders

### 5. Influence calculation

- create a normal influence source
- calculate influence
- confirm calculation completes without a JavaScript error
- confirm at least one expected overlay is visible
- confirm a representative road, river, bridge, or pass is resolved through the scaled-axial edge identity

This is intended to protect the integration path, not exhaustively prove the weighted traversal algorithm.

### 6. JSON round trip

- create one ordinary cell, edge, and point feature
- export schema version 4 JSON
- import that JSON
- confirm the visible features are restored

### 7. Normal map rebuild

- rebuild to a larger ordinary cell count
- confirm the map renders and remains editable

## Assertion guidance

Prefer assertions about visible behavior and stable contracts:

- a cell has the expected type
- a feature is visible at the expected map identity
- export uses schema version `4`
- export omits plains and influence data
- import restores ordinary map features
- influence calculation completes and produces a representative overlay

Avoid assertions about:

- exact SVG element order
- transient status wording unless the wording itself is important
- private object enumeration order
- exact formatting or whitespace in JSON
- implementation details that can change without affecting behavior

## Topology and persistence scope

The minimal browser suite should confirm representative integration cases rather than every mathematical invariant.

Useful focused cases include:

- reversing two adjacent cell IDs resolves the same edge identity
- an ordinary interior edge survives export/import
- a point survives export/import
- fully external imported features do not appear in normalized output

More exhaustive coordinate-property tests should only be added when they remain straightforward and clearly valuable.

## Manual verification

Until the minimal suite exists, use a short manual check after relevant changes:

1. Load the application and confirm the default map renders.
2. Paint one cell.
3. Add one interior edge and one point.
4. Create an influence source and calculate influence.
5. Confirm no JavaScript error occurs during edge-aware traversal.
6. Export and re-import the map.
7. Rebuild to a larger normal cell count.

## Continuous integration intention

A pull-request workflow may be added after the local suite is stable and useful. It should run only the same small suite used locally and should remain independent of GitHub Pages deployment.

Do not add elaborate matrices, custom services, generated artifacts, or workaround infrastructure unless the application later requires them.

## Adding a test

A new test should answer three questions:

1. Which real user behavior or stable data contract does it protect?
2. Can the behavior be tested through the current static application without new infrastructure?
3. Is the test simpler than the regression it prevents?

If not, prefer a manual verification note or a smaller assertion.
