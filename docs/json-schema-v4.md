# JSON Schema Version 4

This document defines the compact persistence format used by the D&D Hex Mapper.

## Example

```json
{
  "schemaVersion": 4,
  "coordinateSystem": "scaled-axial-v1",
  "cellCount": 61,
  "cells": {
    "forest": [[1, 0]],
    "city": [[0, 0]]
  },
  "edges": {
    "road": [[1, 0]]
  },
  "points": {
    "town": [[2, -1]]
  }
}
```

## Top-level object

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `schemaVersion` | integer | yes | Must be `4` for this format. |
| `coordinateSystem` | string | yes | Must be `scaled-axial-v1`. |
| `cellCount` | integer | yes | Number of generated cells, from `1` to `1500`. |
| `cells` | object | yes | Non-default cells grouped by cell type. |
| `edges` | object | yes | Edge features grouped by edge type. |
| `points` | object | yes | Point features grouped by point type. |

Unknown properties are not part of the schema and should not be relied upon.

## Cells

`cells` groups axial cell coordinates by feature type.

Allowed group names are:

- `forest`
- `desert`
- `water`
- `mountains`
- `grain`
- `city`

Each entry is a two-number integer array:

```json
[q, r]
```

Example:

```json
{
  "cells": {
    "forest": [[1, 0], [1, -1]],
    "water": [[-1, 1]]
  }
}
```

### Plains

Plains are the default cell type and are omitted. A generated coordinate that does not appear in any cell group is interpreted as plains.

The legacy `none` value is not exported in schema version 4.

## Edges

`edges` groups doubled axial midpoint coordinates by feature type.

Allowed group names are:

- `road`
- `river`
- `pass`
- `bridge`

Each entry is:

```json
[Q, R]
```

For two incident cells `(q1, r1)` and `(q2, r2)`:

```text
Q = q1 + q2
R = r1 + r2
```

Example:

```json
{
  "edges": {
    "road": [[1, 0]],
    "river": [[0, 1]]
  }
}
```

See [Coordinate System and Topology](coordinate-system.md) for reconstruction and boundary rules.

## Points

`points` groups tripled axial vertex coordinates by feature type.

Allowed group names are:

- `town`
- `toll`
- `poi`

Each entry is:

```json
[U, V]
```

For the three possible incident cells `A`, `B`, and `C`, the point coordinate is their axial sum.

Example:

```json
{
  "points": {
    "town": [[2, -1]],
    "poi": [[-1, 2]]
  }
}
```

Pixel positions and adjacent-cell lists are not persisted.

## Empty groups

Feature groups with no coordinates may be omitted. The containers themselves should be present as objects in newly exported files:

```json
{
  "cells": {},
  "edges": {},
  "points": {}
}
```

Import code should treat a missing feature container as empty when safely possible.

## Data intentionally not persisted

Schema version 4 does not store:

- default plains cells
- temporary multi-cell selection
- active or selected cell
- viewport zoom or pan
- influence visibility settings
- influence budgets
- calculated influence reach or costs
- SVG or pixel geometry

Influence is derived from the current map and application defaults. It is recalculated after import.

## Export cleanup

Before export, the application normalizes the map:

1. Clamp `cellCount` to the supported range.
2. Generate the existing cell set.
3. Remove stored cells outside the generated map.
4. Remove edges with no incident existing cells.
5. Remove points with no incident existing cells.
6. Omit plains and empty feature groups.
7. Serialize coordinates as numeric arrays.

Boundary edges and points remain valid while at least one incident cell exists.

## Import validation

An importer should validate or sanitize:

- top-level object shape
- supported schema version
- coordinate system name
- cell-count range
- known feature type names
- coordinate entries containing exactly two finite integers
- coordinates that correspond to valid cell, edge, or point topology
- duplicate coordinates
- features fully outside the generated map

When duplicate coordinates occur within a group, they should collapse to one feature identity. A coordinate should not be assigned multiple mutually exclusive types; import order must not be used as a public conflict-resolution contract.

## Migration from earlier schemas

The application accepts supported schema version 3 data and converts it into the schema version 4 state model.

Migration responsibilities include:

- convert cell keys into grouped axial arrays
- convert canonical cell-pair edge keys into doubled midpoint coordinates
- convert point records into tripled vertex coordinates when their adjacent cells provide a valid identity
- discard stored pixel coordinates as authoritative identity
- discard selected-cell state
- discard persisted influence settings and calculated influence state
- prune fully external features
- recalculate influence after import

Earlier schema compatibility is an import concern. New exports always use schema version 4.

## Canonical minimal file

```json
{
  "schemaVersion": 4,
  "coordinateSystem": "scaled-axial-v1",
  "cellCount": 1,
  "cells": {},
  "edges": {},
  "points": {}
}
```

The single generated cell is plains because it is not listed in `cells`.

## Round-trip expectations

For a valid schema version 4 file:

- import followed by export should preserve map feature identities
- object group order is not significant
- coordinate-array order inside a group is not semantically significant
- formatting and whitespace are not significant
- derived influence results may differ if application movement defaults change

Tests should compare normalized data rather than raw JSON text.
