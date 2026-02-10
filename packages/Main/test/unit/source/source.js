import assert from 'assert';
import Source from 'Source/Source';

describe('Abstract Source', function () {
    const paramsSource = {
        url: 'http://',
    };
    describe('Instancing of a Source', function () {
        let source;
        it('should throw an error for having no url', function () {
            assert.throws(() => new Source({}), Error);
        });
        it('should succeed', function () {
            source = new Source(paramsSource);
            assert.ok(source.isSource);
        });
        it('testing deprecated options', function () {
            paramsSource.projection = 'EPSG:4326';
            const source = new Source(paramsSource);
            assert.ok(source.isSource);
            assert.equal(source.crs, paramsSource.projection);
        });

        it('testing abstract methods', function () {
            assert.throws(source.urlFromExtent, Error);
            assert.throws(source.anyVisibleData, Error);
        });

        it("method 'onLayerRemoved'", function () {
            const mockedCache = { get: () => {}, set: a => a, clear: () => {} };
            const unusedCrs = 'unusedCrs';
            source._featuresCaches[unusedCrs] = mockedCache;
            source.onLayerRemoved({ unusedCrs });
            assert.equal(source._featuresCaches[unusedCrs], undefined);
        });
    });
});
