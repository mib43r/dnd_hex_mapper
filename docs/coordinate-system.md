# Coordinate System and Topology

This document defines the stable identities used for cells, edges, and points in the D&D Hex Mapper.

The persistence coordinate system is `scaled-axial-v1`.

## Axial cells

Each cell uses an axial coordinate `(q, r)`. The implied cube coordinate is `s = -q - r`.

Cells are exported as numeric pairs:

```json
[1, 0]
```

The six neighbor directions are:

```text
( 1,  0)
( 0,  1)
(-1,  1)
(-1,  0)
( 0, -1)
( 1, -1)
```

## Edge coordinates

An edge identity is the sum of two adjacent cell coordinates:

```text
(Q, R) = (q1 + q2, r1 + r2)
```

This is a doubled axial midpoint. Its geometric midpoint is `(Q / 2, R / 2)`.

Example:

```text
cells: (0, 0) and (1, 0)
edge:  (1, 0)
```

Exported form:

```json
[1, 0]
```

The identity is symmetric: reversing the two cells produces the same edge coordinate. No cell owns a shared edge.

### Edge validity states

| Existing incident cells | Meaning | Required behavior |
| --- | --- | --- |
| 2 | Interior shared edge | Render, edit, and persist. |
| 1 | Map-boundary edge | Valid topology. Intended to render, edit, and persist. |
| 0 | Fully external edge | Ignore during interaction/rendering and remove during normalization or export. |

The current persistence and pruning model retains an edge while at least one reconstructed incident cell exists. Direct rendering and editing of one-cell boundary edges are intended behavior but are not yet fully implemented by the current renderer.

A coordinate with no incident cell in the generated grid is outside the map. It must not appear in a normalized export.

## Point coordinates

A hex vertex is identified by the sum of its three possible incident cell coordinates:

```text
(U, V) = A + B + C
```

This is a tripled axial vertex coordinate. Its rendered position is `(U / 3, V / 3)`.

Example:

```text
incident cells: (0, 0), (1, 0), (1, -1)
point:          (2, -1)
```

Exported form:

```json
[2, -1]
```

A point is retained while at least one reconstructed incident cell exists:

- interior points normally have three existing incident cells
- boundary points may have one or two existing incident cells
- fully external points are removed

Boundary point rendering and editing are implemented by visiting the corners of existing cells.

## Rendering identities

Cells are converted from `(q, r)` to pixels. Edge and point identities remain scaled-axial coordinates in state and JSON.

SVG coordinates are presentation data only. Rounded pixel locations must never become authoritative persistence keys.

For an interior edge, the current renderer derives the line from the shared side of its two existing cells. The planned boundary-edge implementation should derive the side and endpoints from the one existing incident cell and the reconstructed missing neighbor, without creating an outside grid cell.

## Resize, import, and export cleanup

Normalization follows these rules:

1. Generate the existing cell set for `cellCount`.
2. Remove stored cells outside that set.
3. Reconstruct each edge's possible incident cells.
4. Retain an edge when at least one incident cell exists.
5. Remove an edge when no incident cell exists.
6. Reconstruct each point's possible incident cells.
7. Retain a point when at least one incident cell exists.
8. Remove a point when no incident cell exists.

Shrinking a map may turn an interior feature into a boundary feature. Its identity remains stable. Expanding the map may make it interior again.

## Test invariants

Focused tests should verify:

- reversing incident cells does not change an edge identity
- reconstructed edge cells reproduce the original coordinate
- reconstructed point cells reproduce the original coordinate
- identities survive import/export round trips
- boundary features with one incident cell survive normalization
- fully external features are absent from normalized exports
