import assert from 'assert';
import proj4 from 'proj4';
import * as CRS from 'Core/Geographic/Crs';

proj4.defs('EPSG:7133', '+proj=longlat +ellps=GRS80 +no_defs +units=degrees');
proj4.defs('EPSG:INVALID', '+units=invalid +no_defs');

describe('CRS assertions', function () {
    it('should assert that the CRS is valid', function () {
        assert.doesNotThrow(() => CRS.isValid('EPSG:4326'));
        assert.doesNotThrow(() => CRS.isValid('EPSG:7133'));
        assert.doesNotThrow(() => CRS.isValid('EPSG:4978'));
        assert.doesNotThrow(() => CRS.isValid('EPSG:3857'));
        assert.throws(() => CRS.isValid('EPSG:INVALID'));
        assert.throws(() => CRS.isValid('INVALID'));
    });

    it('should assert that the CRS is geographic', function () {
        assert.ok(CRS.isGeographic('EPSG:4326'));
        assert.ok(CRS.isGeographic('EPSG:7133'));
        assert.ok(!CRS.isGeographic('EPSG:4978'));
        assert.ok(!CRS.isGeographic('EPSG:3857'));
    });

    it('should assert that the CRS is using meter unit', function () {
        assert.ok(!CRS.isMetricUnit('EPSG:4326'));
        assert.ok(!CRS.isMetricUnit('EPSG:7133'));
        assert.ok(CRS.isMetricUnit('EPSG:4978'));
        assert.ok(CRS.isMetricUnit('EPSG:3857'));
    });

    it('should get the correct unit for this CRS', function () {
        assert.strictEqual(CRS.getUnit('EPSG:4326'), CRS.UNIT.DEGREE);
        assert.strictEqual(CRS.getUnit('EPSG:7133'), CRS.UNIT.DEGREE);
        assert.strictEqual(CRS.getUnit('EPSG:4978'), CRS.UNIT.METER);
        assert.strictEqual(CRS.getUnit('EPSG:3857'), CRS.UNIT.METER);
        assert.strictEqual(CRS.getUnit('EPSG:INVALID'), undefined);
    });

    it('should check if the CRS is EPSG:4326', function () {
        assert.ok(CRS.is4326('EPSG:4326'));
        assert.ok(!CRS.is4326('EPSG:3857'));
    });

    it('should assert that the CRS is geocentric', function () {
        assert.ok(!CRS.isGeocentric('EPSG:4326'));
        assert.ok(!CRS.isGeocentric('EPSG:7133'));
        assert.ok(CRS.isGeocentric('EPSG:4978'));
        assert.ok(!CRS.isGeocentric('EPSG:3857'));
    });

    it('should return a reasonable epsilon', function () {
        assert.strictEqual(CRS.reasonableEpsilon('EPSG:4326'), 0.01);
        assert.strictEqual(CRS.reasonableEpsilon('EPSG:3857'), 0.001);
    });

    it('should return neu axis order', function () {
        assert.equal(CRS.axisOrder('WGS84'), 'neu');
        assert.equal(CRS.axisOrder('WGS84'), 'neu');
        assert.equal(CRS.axisOrder('EPSG:4269'), 'neu');
    });
});
