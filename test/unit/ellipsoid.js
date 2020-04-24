import assert from 'assert';
import Coordinates from 'Core/Geographic/Coordinates';
import Ellipsoid from 'Core/Math/Ellipsoid';

describe('Ellipsoid', function () {
    const c1 = new Coordinates('EPSG:4326', 0, 0, 0);
    const ellipsoid = new Ellipsoid();
    it('geodeticSurfaceNormalCartographic', () => {
        const v = ellipsoid.geodeticSurfaceNormalCartographic(c1);
        assert.equal(v.x, 1);
        assert.equal(v.y, 0);
        assert.equal(v.z, 0);
        c1.x = 180;
        ellipsoid.geodeticSurfaceNormalCartographic(c1, v);
        assert.equal(v.x, -1);
    });

    it('cartographicToCartesian', () => {
        c1.x = 0;
        const v = ellipsoid.cartographicToCartesian(c1);
        assert.equal(v.x, ellipsoid.size.x);
    });

    it('cartesianToCartographic', () => {
        const altitude = 2000;
        const v = ellipsoid.cartographicToCartesian(c1);
        v.x += altitude;
        ellipsoid.cartesianToCartographic(v, c1);
        assert.equal(c1.z, altitude);
    });

    it('cartographicToCartesianArray', () => {
        c1.z = 0;
        const a = ellipsoid.cartographicToCartesianArray([c1]);
        assert.equal(a.length, 1);
        assert.equal(a[0].x, ellipsoid.size.x);
    });

    it('computeDistance', () => {
        const a = ellipsoid.computeDistance(c1, c1);
        assert.equal(a, 0);
        const c2 = new Coordinates('EPSG:4326', 180, 0, 0);
        const b = ellipsoid.computeDistance(c1, c2);
        assert.ok(b > ellipsoid.size.x);
    });
});

