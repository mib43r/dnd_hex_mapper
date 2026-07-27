# Coordinate System and Topology

This document defines the stable identities used for cells, edges, and points in the D&D Hex Mapper.

## Goals

The topology must:

- remain stable when the SVG size or zoom changes
- avoid ownership rules that assign a shared feature to one arbitrary cell
- support boundary edges and points
- serialize as compact numeric arrays
- reconstruct incident cells without parsing display geometry

The persistence coordinate system is named `scaled-axial-v1`.

## Axial cells

Each cell uses an axial coordinate:

```text
(q, r)
```

The third cube coordinate is implied:

```text
s = -q - r
```

A cell is exported as the numeric pair:

```json
[1, 0]
```

The application may use string keys such as `"1,0"` internally, but exported JSON uses numeric arrays.

## Neighbor directions

The six axial neighbor directions are:

```text
( 1,  0)
( 0,  1)
(-1,  1)
(-1,  0)
( 0, -1)
( 1, -1)
```

Two cells are adjacent when their coordinate difference is one of these directions.

## Edge coordinates

An edge is identified by the sum of its two incident cell coordinates.

For cells:

```text
A = (q1, r1)
B = (q2, r2)
```

The edge coordinate is:

```text
(Q, R) = (q1 + q2, r1 + r2)
```

This is a doubled axial midpoint. The geometric midpoint is:

```text
(Q / 2, R / 2)
```

Example:

```text
cells: (0, 0) and (1, 0)
edge:  (1, 0)
```

Exported form:

```json
[1, 0]
```

### Why doubled coordinates are used

A midpoint between adjacent integer axial cells usually contains halves. Multiplying the midpoint by two keeps the identity integral and avoids floating-point comparisons.

The identity is symmetric: exchanging the two cells produces the same edge coordinate. No cell owns the edge.

### Reconstructing incident cells

Valid edge coordinates map to two possible incident cells. The parity pattern of `(Q, R)` identifies their orientation.

An edge is retained while at least one reconstructed incident cell exists in the current map. It is removed only when neither incident cell exists.

This rule supports editable boundary edges without permitting fully external features.

## Point coordinates

A hex vertex is shared by up to three cells. It is identified by the sum of those three incident cell coordinates.

For cells `A`, `B`, and `C`:

```text
(U, V) = A + B + C
```

This is a tripled axial vertex coordinate. The rendered position is:

```text
(U / 3, V / 3)
```

Example:

```text
incident cells: (0, 0), (1, 0), (1, -1)
point:          (2, -1)
```

Exported form:

```json
[2, -1]
```

### Why tripled coordinates are used

The average of three incident cells may contain thirds. Multiplying by three produces an integral, stable identity.

This replaces the earlier approach of rounding SVG pixel positions. Pixel-based identities can change when geometry constants or rendering precision change; scaled axial identities do not.

### Reconstructing incident cells

A valid point coordinate maps to one of two vertex orientations and reconstructs three possible incident cells.

A point is retained while at least one reconstructed incident cell exists. It is removed only when all incident cells are outside the current map.

Therefore:

- interior points normally have three existing incident cells
- boundary points may have one or two existing incident cells
- fully external points are never rendered or exported

## Rendering

Cells are rendered by converting `(q, r)` to pixels.

Edges are rendered from their midpoint coordinate `(Q / 2, R / 2)` and their reconstructed orientation.

Points are rendered by converting `(U / 3, V / 3)` to pixels.

Rendering coordinates are derived from topology. SVG pixel positions are never the authoritative identity of an edge or point.

## Resize and pruning rules

Whenever the map is rebuilt, imported, or exported:

1. Generate the set of existing cell coordinates for the current `cellCount`.
2. Remove stored cells outside that set.
3. Reconstruct each edge's incident cells.
4. Remove an edge only when none of its incident cells exist.
5. Reconstruct each point's incident cells.
6. Remove a point only when none of its incident cells exist.
7. Never render fully external features.

Shrinking a map may convert an interior feature into a boundary feature. That feature remains valid. Expanding the map can make it interior again without changing its identity.

## Canonical examples

```text
Cell
  coordinate: (1, 0)
  export:     [1, 0]

Edge between (0, 0) and (1, 0)
  coordinate: (1, 0)
  render at:  (0.5, 0)
  export:     [1, 0]

Point shared by (0, 0), (1, 0), and (1, -1)
  coordinate: (2, -1)
  render at:  (2/3, -1/3)
  export:     [2, -1]
```

## Invariants for tests

Automated topology tests should verify that:

- exchanging incident cells does not change an edge identity
- all six edges around a cell have unique valid identities
- all six vertices around a cell have unique valid identities
- reconstructed edge cells reproduce the original edge coordinate
- reconstructed point cells reproduce the original point coordinate
- identities remain unchanged across render and import/export round trips
- boundary features survive with one incident cell
- fully external features are pruned
