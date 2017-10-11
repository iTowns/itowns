/* global describe, it */
import proj4 from 'proj4';
import assert from 'assert';
import Coordinates, { UNIT } from '../src/Core/Geographic/Coordinates';

// Define projection that we will use (taken from https://epsg.io/3946, Proj4js section)
proj4.defs('EPSG:3946', '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

// Asster two float number are equals, with 5 digits precision.
function assertFloatEqual(float1, float2, precision = 5) {
    assert.equal(Number(float1).toFixed(precision), Number(float2).toFixed(precision));
}

// Assert two coordinates obects are equals.
function assertCoordEqual(coord1, coord2) {
    assert.equal(coord1.crs, coord2.crs);
    assert.equal(coord1._internalStorageUnit, coord2._internalStorageUnit);
    assertFloatEqual(coord1._values[0], coord2._values[0]);
    assertFloatEqual(coord1._values[1], coord2._values[1]);
    assertFloatEqual(coord1._values[2], coord2._values[2]);
}

describe('Coordinate conversions', function () {
    it('should correctly convert from EPSG:4326 to EPSG:4978', function () {
        var coord1 = new Coordinates('EPSG:4326', 15.0, 12.0);
        var coord2 = coord1.as('EPSG:4978');
        // verify value for x and y.
        assertFloatEqual(6027050.95, coord2.x(), 2);
        assertFloatEqual(1614943.43, coord2.y(), 2);
    });
    it('should correctly convert from EPSG:4326 to EPSG:4978 and back to EPSG:4326', function () {
        var coord1 = new Coordinates('EPSG:4326', 15.0, 12.0);
        var coord2 = coord1.as('EPSG:4978');
        var coord3 = coord2.as('EPSG:4326');
        assertCoordEqual(coord1, coord3);
    });
    it('should correctly convert from EPSG:3946 (Lyon WFS bus example) to EPSG:4978 (Globe) and back to EPSG:3946', function () {
        var coord1 = new Coordinates('EPSG:3946', 1500000, 5100000, 12);
        var coord2 = coord1.as('EPSG:4978');
        var coord3 = coord2.as('EPSG:3946');
        assertCoordEqual(coord1, coord3);
    });
    // This case happend in iTowns when we convert the tile extent (4326 radian) to a target WFS server (EPSG:3946 for example) to request Lyon bus line in WFS.
    it('should correctly convert from EPSG:4326 Radian (tiles extent) to EPSG:3946 (Lyon WFS) and back to EPSG:4326 (degrees)', function () {
        // geographic example for EPSG 4326 in degrees
        var longIn = 4.82212;
        var latIn = 45.723722;
        // let's define an input coordinate EPSG:4326 in radian.
        var coord1 = new Coordinates('EPSG:4326', longIn / 180 * Math.PI, latIn / 180 * Math.PI);
        coord1._internalStorageUnit = UNIT.RADIAN;
        // convert coordinate in EPSG:3946
        var coord2 = coord1.as('EPSG:3946');
        // verify intermediate values
        assertFloatEqual(1841825.45, coord2.x(), 2);
        assertFloatEqual(5170916.93, coord2.y(), 2);
        // and convert back to EPSG:4626 standard in degree.
        var coord3 = coord2.as('EPSG:4326');
        // verify coordinates
        assertFloatEqual(longIn, coord3.longitude());
        assertFloatEqual(latIn, coord3.latitude());
    });
});

describe('Coordinate surface normale property', function () {
    it('should correctly compute a surface normal ', function () {
        const coord0 = new Coordinates('EPSG:4326', 15.0, 12.0).as('EPSG:4978');
        const normal0 = coord0.geodesicNormal;

        assertFloatEqual(normal0.x, 0.944818029);
        assertFloatEqual(normal0.y, 0.253163227);
        assertFloatEqual(normal0.z, 0.207911690);

        const coord1 = new Coordinates('EPSG:4978', 6027050.95, 1614943.43, 1317402.53);
        const normal1 = coord1.geodesicNormal;

        assertFloatEqual(normal0.x, normal1.x);
        assertFloatEqual(normal0.y, normal1.y);
        assertFloatEqual(normal0.z, normal1.z);
    });
    it('should correctly return the default up vector for planar mode ', function () {
        const coord0 = new Coordinates('EPSG:3946', 15.0, 12.0);

        const normal0 = coord0.geodesicNormal;

        assert.equal(0, normal0.x);
        assert.equal(0, normal0.y);
        assert.equal(1, normal0.z);
    });
});
