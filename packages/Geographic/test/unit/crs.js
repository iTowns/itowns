import * as CRS from 'Crs';
import assert from 'assert';
import proj4 from 'proj4';

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

describe('CRS.defsFromWkt()', function () {
    it('Compound coordinate system', function () {
        const wkt = 'COMPD_CS["NAD83(2011) / UTM zone 12N + NAVD88 height - Geoid12B (metres)",PROJCS["NAD83(2011) / UTM zone 12N",GEOGCS["NAD83(2011)",DATUM["NAD83_National_Spatial_Reference_System_2011",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],AUTHORITY["EPSG","1116"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","6318"]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",-111],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["X",EAST],AXIS["Y",NORTH],AUTHORITY["EPSG","6341"]],VERT_CS["NAVD88 height",VERT_DATUM["North American Vertical Datum 1988",2005,AUTHORITY["EPSG","5103"]],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Up",UP],AUTHORITY["EPSG","5703"]]]';
        const crs = CRS.defsFromWkt(wkt);
        assert.equal(crs, 'EPSG:6341');
    });
    it('Simple coordinate system', function () {
        const wkt = 'PROJCS["RGF93 / CC46",GEOGCS["RGF93",DATUM["Reseau_Geodesique_Francais_1993",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],TOWGS84[0,0,0,0,0,0,0],AUTHORITY["EPSG","6171"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4171"]],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["standard_parallel_1",45.25],PARAMETER["standard_parallel_2",46.75],PARAMETER["latitude_of_origin",46],PARAMETER["central_meridian",3],PARAMETER["false_easting",1700000],PARAMETER["false_northing",5200000],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["X",EAST],AXIS["Y",NORTH],AUTHORITY["EPSG","3946"]]';
        const crs = CRS.defsFromWkt(wkt);
        assert.equal(crs, 'EPSG:3946');
    });
});
