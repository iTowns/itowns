import assert from 'assert';
import Coordinates from 'Core/Geographic/Coordinates';
import Ellipsoid from 'Core/Math/Ellipsoid';

describe('Ellipsoid', function () {
    const c1 = new Coordinates('EPSG:4326', 0, 0, 0);
    const ellipsoid = new Ellipsoid();

    it('geodeticSurfaceNormal', function () {
        c1.setFromValues(6378137, 0, 0);
        const v = ellipsoid.geodeticSurfaceNormal(c1);
        assert.equal(v.x, 1);
        assert.equal(v.y, 0);
        assert.equal(v.z, 0);
        c1.x = -6378137;
        ellipsoid.geodeticSurfaceNormal(c1, v);
        assert.equal(v.x, -1);
    });

    it('geodeticSurfaceNormalCartographic', function () {
        c1.setFromValues(0, 0, 0);
        const v = ellipsoid.geodeticSurfaceNormalCartographic(c1);
        assert.equal(v.x, 1);
        assert.equal(v.y, 0);
        assert.equal(v.z, 0);
        c1.x = 180;
        ellipsoid.geodeticSurfaceNormalCartographic(c1, v);
        assert.equal(v.x, -1);
    });

    it('cartographicToCartesian', function () {
        c1.setFromValues(0, 0, 0);
        const v = ellipsoid.cartographicToCartesian(c1);
        assert.equal(v.x, ellipsoid.size.x);
    });

    it('cartesianToCartographic', function () {
        c1.setFromValues(0, 0, 0);
        const altitude = 2000;
        const v = ellipsoid.cartographicToCartesian(c1);
        v.x += altitude;
        ellipsoid.cartesianToCartographic(v, c1);
        assert.equal(c1.z, altitude);
    });

    it('cartographicToCartesianArray', function () {
        c1.setFromValues(0, 0, 0);
        const a = ellipsoid.cartographicToCartesianArray([c1]);
        assert.equal(a.length, 1);
        assert.equal(a[0].x, ellipsoid.size.x);
    });

    it('geodesic distance', function () {
        c1.setFromValues(0, 0, 0);
        const a = ellipsoid.geodesicDistance(c1, c1);
        assert.equal(a, 0);
        const c2 = new Coordinates('EPSG:4326', 180, 0, 0);
        const b = ellipsoid.geodesicDistance(c1, c2);
        assert.ok(b > ellipsoid.size.x);

        // try example https://geodesie.ign.fr/contenu/fichiers/Distance_longitude_latitude.pdf
        const c3 = new Coordinates('EPSG:4326', 0, 45, 0);
        const c4 = new Coordinates('EPSG:4326', 1.83421, 46.2579066, 0);

        const d = ellipsoid.geodesicDistance(c3, c4) / 1000;
        assert.ok(Math.abs(d - 200) < 0.01);
    });
});
