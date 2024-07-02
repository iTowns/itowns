## iTowns Geodesy

Geodesy is the science of measuring and representing the geometry, gravity, and spatial orientation of the Earth in temporally varying 3D.

* [Coordinates](http://www.itowns-project.org/itowns/docs/#api/Geographic/Coordinates) : A Coordinates object (geodetic datum), defined by a [crs] and three values.
* [Extent](http://www.itowns-project.org/itowns/docs/#api/Geographic/Extent) : Extent is geographical bounding rectangle defined by 4 limits: west, east, south and north. If crs is tiled projection (WMTS or TMS), the extent is defined by zoom, row and column.
* [Crs](http://www.itowns-project.org/itowns/docs/#api/Geographic/CRS) : This module provides basic methods to manipulate a CRS (as a string). Visiting [epsg.io](https://epsg.io/) to more coordinate system worldwide. Use **Proj4js** definition in epsg.io.
* [Geogrid](http://www.itowns-project.org/itowns/docs/#api/Geographic/GeoidGrid) : An instance of GeoidGrid allows accessing some geoid height grid data from Coordinates.
* [OrientationUtils](http://www.itowns-project.org/itowns/docs/#api/Geographic/OrientationUtils) : it provides methods to compute the quaternion that models a rotation defined with various conventions, including between different CRS.
* Ellipsoid : In geodesy, a reference ellipsoid is a mathematically defined surface that approximates the geoid.

# Install

`npm install --save @itowns/geodesy`

# Getting started

```js
import { Coordinates, Extent, CRS } from @itowns/geodesy;

const coordinates = new Coordinates('EPSG:4326', 88.002445, 50.336522, 120.32201);
const extent = new Extent('EPSG:4326', 88.002445, 50.336522, 22.021, 50.302548);

// change projection system to pseudo mercator

coordinates.as('EPSG:3857');
extent.as('EPSG:3857');

// change projection system to EPSG:2154

// defs EPSG:2154 crs (visiting epsg.io to get new definition and export to Proj4js)
CRS.defs('EPSG:2154','+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');

coordinates.as('EPSG:2154');

```
## Geogrid example 

```js
// Create a set of gridded data.
const data = [
    [1, 2, 3],
    [2, 3, 4],
    [3, 4, 5],
];
// This set of data presents the following spatial distribution of geoid heights values :
//
//    Latitudes  ^
//               |
//         41.0  |   3  4  5
//         40.5  |   2  3  4
//         40.0  |   1  2  3
//               |------------->
//                   1  2  3     Longitudes

// Create a GeoidGrid allowing to access the gridded data.
const geoidGrid = new GeoidGrid(
    new Extent('EPSG:4326', 1, 3, 40, 41),
    new THREE.Vector2(1, 0.5),
    (verticalIndex, horizontalIndex) => data[verticalIndex][horizontalIndex],
);

// Access a value of geoid height at some geographic coordinates.
// The value is interpolated from the gridded data.
const value = geoidGrid.getHeightAtCoordinates(
    new Coordinates('EPSG:4326', 1.5, 40.25)
);
// This should return 2.0, which is the result from the bi-linear
// interpolation at the center of the `[[1, 2], [2, 3]]` subsection
// of the grid data.
```

## OrientationUtils example 
```js
// Compute the rotation around the point of origin from a frame aligned with Lambert93 axes (epsg:2154),
// to the geocentric frame (epsg:4978)
quat_crs2crs = OrientationUtils.quaternionFromCRSToCRS("EPSG:2154", "EPSG:4978")(origin);
// Compute the rotation of a sensor platform defined by its attitude
quat_attitude = OrientationUtils.quaternionFromAttitude(attitude);
// Compute the rotation from the sensor platform frame to the geocentric frame
quat = quat_crs2crs.multiply(quat_attitude);
```

Visiting iTowns [documentation](http://www.itowns-project.org/itowns/docs/#home) for more information.
