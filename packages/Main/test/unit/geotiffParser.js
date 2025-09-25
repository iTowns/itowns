import assert from 'assert';
import { CRS, Extent } from '@itowns/geographic';
import * as GeoTIFF from 'geotiff';
import GeotiffParser, { selectDataType, GeotiffNode } from 'Parser/GeotiffParser';

import {
    ByteType,
    FloatType,
    HalfFloatType,
    IntType,
    RedFormat,
    RGBAFormat,
    ShortType,
    UnsignedByteType,
    UnsignedIntType,
    UnsignedShortType,
} from 'three';


describe('GeotiffParser', function () {
    let float32Image;
    let rgbaImage;

    const float32Extent = new Extent(
        'EPSG:4326',
        2.187265625,
        2.197265625,
        43.320078125,
        43.330078125,
    );

    CRS.defs(
        'EPSG:2154',
        '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000'
            + ' +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    );
    const rgbaExtent = new Extent(
        'EPSG:2154',
        1351632.5,
        1351642.5,
        6240690.5,
        6240700.5,
    );

    describe('Fetch test data', function () {
        it('Fetch float32 data', async function () {
            float32Image = await GeoTIFF.fromFile('test/data/geotiff/float32.tif')
                .then(geotiff => geotiff.getImage());
        });
        it('Fetch RGBA data', async function () {
            rgbaImage = await GeoTIFF.fromFile('test/data/geotiff/rgba.tif')
                .then(geotiff => geotiff.getImage());
        });
    });

    describe('Unit tests for GeotiffParser', function () {
        it('should select the right texture type', function () {
            assert.strictEqual(selectDataType(1, 8), UnsignedByteType);
            assert.strictEqual(selectDataType(1, 16), UnsignedShortType);
            assert.strictEqual(selectDataType(1, 32), UnsignedIntType);
            assert.strictEqual(selectDataType(2, 8), ByteType);
            assert.strictEqual(selectDataType(2, 16), ShortType);
            assert.strictEqual(selectDataType(2, 32), IntType);
            assert.strictEqual(selectDataType(3, 16), HalfFloatType);
            assert.strictEqual(selectDataType(3, 32), FloatType);

            const error = {
                name: 'Error',
                message: 'Unsuported data format/bitsPerSample combination',
            };
            assert.throws(() => selectDataType(1, 64), error);
            assert.throws(() => selectDataType(2, 64), error);
            assert.throws(() => selectDataType(3, 64), error);
            assert.throws(() => selectDataType(4, 0), error);
        });

        it('should instantiate GeotiffNode correctly', function () {
            let node = new GeotiffNode({ image: float32Image });
            assert.strictEqual(node.resolution[0], 0.0003448275862068892);
            assert.strictEqual(node.resolution[1], -0.00034482758620682795);
            assert.strictEqual(node.origin[0], 2.187265625);
            assert.strictEqual(node.origin[1], 43.330078125);
            assert.strictEqual(node.dataType, FloatType);
            assert.strictEqual(node.width, 29);
            assert.strictEqual(node.height, 29);

            node = new GeotiffNode({
                image: float32Image,
                resolution: [1, 2],
                origin: [3, 4],
            });
            assert.strictEqual(node.resolution[0], 1);
            assert.strictEqual(node.resolution[1], 2);
            assert.strictEqual(node.origin[0], 3);
            assert.strictEqual(node.origin[1], 4);
        });

        it('should extract image window from extent', function () {
            const node = new GeotiffNode({ image: float32Image });

            let wnd = node.extentToImageWindow(float32Extent);
            assert.equal(Math.abs(wnd[0]), 0);
            assert.equal(Math.abs(wnd[1]), 0);
            assert.equal(Math.abs(wnd[2]), node.width);
            assert.equal(Math.abs(wnd[3]), node.height);

            // Test with a zero-sized window
            wnd = node.extentToImageWindow({
                west: 2.187265625,
                east: 2.187265625,
                south: 43.330078125,
                north: 43.330078125,
            });
            assert.equal(Math.abs(wnd[0]), 0);
            assert.equal(Math.abs(wnd[1]), 0);
            assert.equal(Math.abs(wnd[2]), 1);
            assert.equal(Math.abs(wnd[3]), 1);
        });

        it('should parse images with one sample', async function () {
            const texture = await GeotiffParser.parse(
                float32Image,
                {
                    in: {
                        crs: 'EPSG:4326',
                    },
                    extent: float32Extent,
                },
            );
            assert.ok(texture.isDataTexture);
            assert.equal(texture.extent, float32Extent);
            assert.equal(texture.format, RedFormat);
            assert.equal(texture.type, FloatType);
        });

        it('should parse images with three samples', async function () {
            const texture = await GeotiffParser.parse(
                rgbaImage,
                {
                    in: {
                        crs: 'EPSG:2154',
                    },
                    extent: rgbaExtent,
                },
            );
            assert.ok(texture.isDataTexture);
            assert.equal(texture.extent, rgbaExtent);
            assert.equal(texture.format, RGBAFormat);
            assert.equal(texture.type, UnsignedByteType);
        });
    });
});

