# Observer mode and scale lab

Observer mode relates a selected point to the current scenario. It preserves the event location and physics inputs. Selecting a new event keeps the observation point so users can compare exposure at the same place.

## Geometry and interpretation

- Surface distance uses haversine distance with an Earth radius of 6,371 km.
- Bearing is the initial compass direction from observer to ground zero. Coincident and antipodal points have no unique bearing.
- A point belongs to every effect zone whose radius includes that point. The boundary is inclusive. Overlapping effects appear separately.
- A quaternion interpolation draws the route along the sphere and handles coincident points, the date line, and antipodes. An antipodal route is one of infinitely many equal-length paths.
- The cyan marker denotes the observer. The optional cyan dashed circle is a hypothetical crater or caldera size comparison centered on that observer. The actual event stays in place.
- Observer labels use present-day city coordinates, independent of the scenario year.

The model does not calculate observer arrival times, sightlines, terrain shielding, wind-dependent ashfall, or coastal tsunami exposure. A location outside the local footprints is not a finding of safety. Global effects remain separate.

## Scale diagram

Asteroids appear by incoming diameter. Eruptions use a square face of a cube whose volume equals bulk erupted volume. The square is a volume comparison, not a plume or caldera shape.

The object and reference share one linear scale, with no minimum displayed size for small objects. The Eiffel Tower reference includes its antenna and uses the [operator's published 330 m height](https://www.toureiffel.paris/en/news/history-and-culture/300-330-meters-story-towers-height). The alternate ruler is an arbitrary 1 km reference length. Circular footprint area uses pi times radius squared.

## Verification

The full suite contains 33 tests. The 13 added tests cover observer distance and bearing, overlap and boundary membership, undefined bearings, airburst exclusion, route geometry, accent-insensitive city search, and exported observer content.

Mutation checks ran in isolated temporary copies. Each harness first accepted a comment-only change. Deliberate faults then failed assertions as follows:

| Fault | Observed failure |
| --- | --- |
| Reverse zone containment | Ground-zero overlap, boundary, and remote-point assertions |
| Double distance | Date-line distance and boundary assertions |
| Swap compass axes | Date-line bearing and cardinal-direction assertions |
| Give an airburst a crater | Airburst footprint assertion |
| Collapse route to its source | Noncoincident endpoint assertions |
| Put route inside Earth | Endpoint and unit-sphere assertions, including coincident points |
| Remove accent normalization | Unaccented search for São Paulo |
| Remove report name escaping | Escaped observer-name assertion |
| Replace outside-zone qualification with a safety claim | Outside-zone report assertion |

The tests do not validate the underlying physical effect models or actual browser visibility. Separate browser checks exercise city selection, coordinates, globe picking, camera controls, surface-impact and airburst footprints, desktop and mobile layout, and the scale-studio controls. Native desktop packaging and physical-phone performance remain untested in this change.
