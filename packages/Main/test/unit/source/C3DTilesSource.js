import assert from 'assert';
import C3DTilesSource from 'Source/C3DTilesSource';
import C3DTilesIonSource from 'Source/C3DTilesIonSource';
import sinon from 'sinon';
import Fetcher from 'Provider/Fetcher';

const tileset = {};

describe('C3DTilesSource', function () {
    let stubFetcherJson;
    before(function () {
        stubFetcherJson = sinon.stub(Fetcher, 'json')
            .callsFake(() => Promise.resolve(tileset));
    });
    after(function () {
        stubFetcherJson.restore();
    });

    it('should throw an error for having no required parameters', function () {
        assert.throws(() => new C3DTilesSource({}), Error);
    });

    it('should instance C3DTilesSource', function (done) {
        const url3dTileset = 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/' +
                '3DTiles/lyon_1_4978/tileset.json';
        const source = new C3DTilesSource({ url: url3dTileset });
        source.whenReady
            .then(() => {
                assert.ok(source.isC3DTilesSource);
                assert.strictEqual(source.url, url3dTileset);
                assert.strictEqual(source.baseUrl, url3dTileset.slice(0, url3dTileset.lastIndexOf('/') + 1));
                done();
            }).catch(done);
    });

    describe('C3DTilesIonSource', function () {
        it('should throw an error for having no required parameters', function () {
            assert.throws(() => new C3DTilesIonSource({}), Error);
            assert.throws(() => new C3DTilesIonSource({ accessToken: 'free-3d-tiles' }), Error);
            assert.throws(() => new C3DTilesIonSource({ assetId: '66666' }), Error);
        });
    });
});

