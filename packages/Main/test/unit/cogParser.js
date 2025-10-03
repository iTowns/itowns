import assert from 'assert';
import fs from 'fs';
import * as GeoTIFF from 'geotiff';
import sinon from 'sinon';


describe('CogSource', function () {
    let source;
    let fetchStub;

    before(function () {
        fetchStub = sinon.stub(global, 'fetch')
            .callsFake(url => new Response(
                fs.readFileSync(url),
                {
                    status: 200,
                },
            ));
    });

    describe('Fetch test data', function () {
        it('Fetch rgba cog data', async function () {
            source = await GeoTIFF.fromUrl('test/data/geotiff/rgba.cog.tif');
            console.log(source);
        });
    });

    describe('Unit tests for GeotiffParser', function () {
        it('should parse COG correctly', async function () {
            // do
        });
    });

    after(function () {
        fetchStub.restore();
    });
});

