import assert from 'assert';
import CogParser from 'Parser/CogParser';
import CogSource from 'Source/CogSource';
import { CRS, Extent } from '@itowns/geographic';

import {
    UnsignedByteType,
    RedFormat,
    RGBAFormat,
} from 'three';


let source;
let dataLoaded = false;
CRS.defs(
    'EPSG:2154',
    '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000'
        + ' +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
);


describe('CogSource', function () {
    it('should instantiate a CogSource', function () {
        source = new CogSource({
            url: 'https://github.com/iTowns/iTowns2-sample-data/raw/refs/heads/master/tiff/rgba.cog.tif',
            crs: 'EPSG:2154',
        });

        assert.ok(source.isCogSource);
    });

    it('should fetch data for test', async function () {
        await source.whenReady;
        dataLoaded = true;
    });

    it('should read overview tree correctly', function () {
        if (!dataLoaded) { this.skip(); }

        assert.strictEqual(source.extent.west, 1351632.5);
        assert.strictEqual(source.extent.east, 1351642.5);
        assert.strictEqual(source.extent.south, 6240690.5);
        assert.strictEqual(source.extent.north, 6240700.5);

        // Sample stores the full resolution image plus 5 overviews
        assert.equal(source.overviews.length, 6);

        const firstImage = source.overviews[0];
        for (let index = 0; index < source.overviews.length; index++) {
            const overview = source.overviews[index];

            assert.strictEqual(overview.origin, firstImage.origin);
            assert.strictEqual(overview.dataType, UnsignedByteType);

            assert.strictEqual(
                overview.width,
                Math.floor(firstImage.width / 2 ** index),
            );
            assert.strictEqual(
                overview.height,
                Math.floor(firstImage.height / 2 ** index),
            );

            assert.strictEqual(
                overview.resolution[0],
                firstImage.resolution[0] * firstImage.width / overview.width,
            );
            assert.strictEqual(
                overview.resolution[1],
                firstImage.resolution[1] * firstImage.height / overview.height,
            );
        }
    });
});


describe('CogParser', function () {
    const targetExtent = new Extent(
        'EPSG:2154',
        1351632.5,
        1351634.5,
        6240690.5,
        6240695.5,
    );

    it('should parse cog image correctly', async function () {
        if (!dataLoaded) { this.skip(); }

        const texture = await CogParser.parse(
            undefined,
            {
                in: {
                    ...source,
                    pool: undefined,
                },
                extent: targetExtent,
            },
        );

        assert.ok(texture.isDataTexture);
        assert.equal(texture.extent, targetExtent);
        assert.equal(texture.format, RGBAFormat);
        assert.equal(texture.type, UnsignedByteType);
    });

    it('should throw error if no overview tree is found', async function () {
        if (!dataLoaded) { this.skip(); }

        const overviews = source.overviews;
        source.overviews = [];

        await assert.rejects(
            CogParser.parse(
                undefined,
                {
                    in: {
                        ...source,
                        pool: undefined,
                    },
                    extent: targetExtent,
                },
            ),
            {
                name: 'Error',
                message: 'Unable to determine a best overview for given extent in the COG dataset.'
                    + ' LevelTree parsed by CogSource is probably empty.',
            },
        );

        source.overviews = overviews;
    });

    it('should prevent loading too large overviews', async function () {
        if (!dataLoaded) { this.skip(); }

        const texture = await CogParser.parse(
            undefined,
            {
                in: {
                    ...source,
                    pool: undefined,
                    maxTextureSize: 8,
                },
                extent: targetExtent,
            },
        );
        assert.equal(texture.source.data.width, 1);
        assert.equal(texture.source.data.height, 1);
        assert.equal(texture.format, RedFormat);
    });
});

