## iTowns Geographic

The geographic package provides utilities for handling coordinates, ellipsoids, extents and rotations across different coordinate systems.

* [Coordinates](http://www.itowns-project.org/itowns/docs/#api/Geographic/Coordinates) : A Coordinates object (geodetic datum), defined by a [crs] and three values.
* [Coordinates stars] : get sun position, azimuth, ascention, ecliptic longitude and declination from date.
* [Coordinate Reference System](http://www.itowns-project.org/itowns/docs/#api/Geographic/CRS) : This module provides basic methods to manipulate a CRS (as a string). to explore available coordinates systems and use their **proj4js** definition to define them in itowns with `proj4.defs(crs, proj4def)`.
* Ellipsoid : A representation of an [ellipsoid](https://en.wikipedia.org/wiki/Ellipsoid) and useful computation methods (geodetic normal, etc.)
* Ellipsoid Size: The length of the earth ellispoid semi-axes.
* [Extent](http://www.itowns-project.org/itowns/docs/#api/Geographic/Extent) : Extent is geographical bounding rectangle defined by a crs and 4 limits: west, east, south and north .
* [OrientationUtils](http://www.itowns-project.org/itowns/docs/#api/Geographic/OrientationUtils) : utilities to compute a rotation quaternion from various rotation conventions, including between different crs.

# Install

`npm install --save @itowns/geographic`

# Getting started

```js
import { Coordinates, Extent, CRS } from '@itowns/geographic';

const coordinates = new Coordinates('EPSG:4326', 88.002445, 50.336522, 120.32201);
const extent = new Extent('EPSG:4326', 88.002445, 50.336522, 22.021, 50.302548);

// change projection system to pseudo mercator

coordinates.as('EPSG:3857');
extent.as('EPSG:3857');

// change projection system to EPSG:2154

// defs EPSG:2154 crs (visit epsg.io to get the proj4js definition of a crs)
CRS.defs('EPSG:2154','+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');

coordinates.as('EPSG:2154');

```

## OrientationUtils example 

In geodesy, attitude refers to the orientation of a geodetic instrument or platform in three-dimensional space. It is defined by the angles that describe how an instrument or a vehicle (like a satellite or aircraft) is positioned relative to a reference coordinate system, typically the Earth's surface or a local tangent plane.

```js
// Compute the rotation around the point of origin from a frame aligned with Lambert93 axes (epsg:2154),
// to the geocentric frame (epsg:4978)

quat_crs2crs = OrientationUtils.quaternionFromCRSToCRS("EPSG:2154", "EPSG:4978")(origin);

// Compute the rotation of a sensor platform defined by its attitude

const attitude = {
	// Rotation around the longitudinal axis of the object (front-to-back axis), tilting the object sideways.
	Roll: 0.0,
	// Rotation around the lateral axis (side-to-side axis), moving the nose or front up or down.
	Pitch: Math.PI * 0.2,
	// Rotation around the vertical axis (top-to-bottom axis), changing the direction the object is facing horizontally.
	Yaw: Math.PI * 0.5,
}

quat_attitude = OrientationUtils.quaternionFromAttitude(attitude);

// Compute the rotation from the sensor platform frame to the geocentric frame

quat = quat_crs2crs.multiply(quat_attitude);
```

Visit the iTowns [documentation](http://www.itowns-project.org/itowns/docs/#home) for more information.
