import assert from 'assert';
import Source from 'Source/Source';

describe('Abstract Source', function () {
    const paramsSource = {
        url: 'http://',
    };
    describe('Instancing of a Source', function () {
        let source;
        it('should succeed', function () {
            source = new Source(paramsSource);
            assert.ok(source.isSource);
        });
        it('testing abstract methods', function () {
            assert.throws(source.urlFromExtent, Error);
            assert.throws(source.extentInsideLimit, Error);
        });
    });
});
