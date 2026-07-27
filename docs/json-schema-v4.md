# JSON Schema Version 4

This document defines the compact map persistence format used by the D&D Hex Mapper.

## Canonical shape

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

## Top-level fields

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `schemaVersion` | integer | yes | Must be `4`. |
| `coordinateSystem` | string | yes | Must be `scaled-axial-v1`. |
| `cellCount` | integer | yes | Generated cell count from `1` to `1500`. |
| `cells` | object | yes | Non-default cells grouped by type. |
| `edges` | object | yes | Edge features grouped by type. |
| `points` | object | yes | Point features grouped by type. |

Unknown properties are outside the version 4 contract and must not be relied upon.

## Cells

Allowed groups are `forest`, `desert`, `water`, `mountains`, `grain`, and `city`. Each entry is `[q, r]`.

Plains are the default and are omitted. A generated cell absent from every group is interpreted as plains.

## Edges

Allowed groups are `road`, `river`, `pass`, and `bridge`. Each entry is a doubled axial edge coordinate `[Q, R]`.

For adjacent cells `(q1, r1)` and `(q2, r2)`:

```text
Q = q1 + q2
R = r1 + r2
```

An edge with one or two incident grid cells is topology-valid. An edge with no incident grid cell is fully external and is removed during normalization/export. Current direct rendering and editing of one-cell boundary edges is not yet complete; see [Coordinate System and Topology](coordinate-system.md).

## Points

Allowed groups are `town`, `toll`, and `poi`. Each entry is a tripled axial vertex coordinate `[U, V]`.

A point with at least one incident grid cell is valid. Fully external points are removed.

## Empty groups

Empty feature groups may be omitted. New exports keep the top-level containers:

```json
{
  "cells": {},
  "edges": {},
  "points": {}
}
```

## Data intentionally not exported

Schema version 4 does not export:

- default plains cells
- active or multi-cell selection
- viewport zoom or pan
- influence visibility settings
- influence budgets or terrain multipliers
- calculated influence reach or costs
- SVG geometry

Influence reach is derived and recalculated after import.

## Compatible influence-setting input

The importer may read compatible influence settings from older or extended input:

- a legacy shared influence or overlay budget
- per-influence budgets
- per-influence terrain multipliers

This is migration compatibility, not part of the schema version 4 export contract. These optional fields are not emitted by a new export and therefore are not guaranteed to survive an export/import round trip.

Calculated influence costs, reach maps, and calculated-state flags are ignored and regenerated.

## Export cleanup

Before export, the application normalizes the map:

1. Clamp `cellCount` to the supported range.
2. Generate the current grid cell set.
3. Remove stored cells outside that set.
4. Remove edges with no incident grid cell.
5. Remove points with no incident grid cell.
6. Omit plains and empty feature groups.
7. Serialize identities as numeric arrays.

Boundary features with at least one incident cell remain valid. Fully external features are absent from normalized output.

## Import behavior

The importer sanitizes:

- top-level object shape
- schema version and coordinate-system selection
- cell-count range
- known feature types
- two-integer coordinate arrays
- features fully outside the generated grid
- invalid positive-number influence compatibility settings

Version 4 grouped data is selected only when `schemaVersion` is exactly `4` and `coordinateSystem` is exactly `scaled-axial-v1`. Other supported inputs use the legacy compatibility path.

## Migration from earlier formats

Compatibility migration can:

- convert cell-key objects into grouped axial arrays
- convert adjacent-cell edge keys into doubled coordinates
- convert point records into tripled coordinates when three adjacent cells are available
- discard pixel coordinates as authoritative identity
- discard selected-cell and calculated influence state
- read compatible influence budgets and terrain multipliers
- prune fully external features
- recalculate influence after import

New exports always use schema version `4`.

## Minimal file

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

## Round-trip expectations

For valid schema version 4 map data:

- map feature identities survive import followed by export
- object and coordinate-array order are not semantically significant
- formatting and whitespace are not significant
- compatibility-only influence settings are not part of the round-trip guarantee
- derived influence results may change when application defaults change
