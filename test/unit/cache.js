import assert from 'assert';
import Cache, { CACHE_POLICIES } from 'Core/Scheduler/Cache';

describe('Cache', function () {
    let cache;
    describe('Instance Cache', function () {
        it('no time limit (or infinity)', function () {
            const cache = new Cache();
            assert.equal(cache.ttl, 0);
        });
        it('with time limit', function () {
            cache = new Cache(CACHE_POLICIES.TEXTURE);
            assert.equal(cache.ttl, 900000);
        });
    });

    describe('Unit tests', function () {
        it('Set/Get value in Cache', function () {
            cache.set('a', 0);
            cache.set('b', 1, 1);
            assert.equal(cache.get(0), 'a');
            assert.equal(cache.get(1, 1), 'b');
        });

        it('delete value in Cache', function () {
            const cacheSize = cache.size;
            cache.delete(1, 1);
            assert.equal(cache.get(1, 1), undefined);
            assert.equal(cache.size, cacheSize - 1);
        });

        it('Clear Cache', function () {
            cache.set('c', 2, 2, 2);
            cache.clear();
            assert.equal(cache.get(0), undefined);
            assert.equal(cache.get(2, 2, 2), undefined);
            assert.equal(cache.size, 0);
        });
    });
});
