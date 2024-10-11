import assert from 'assert';
import Cache, { CACHE_POLICIES } from 'Core/Scheduler/Cache';

describe('Cache', function () {
    const cache = new Cache();
    it('Instance Cache', function () {
        assert.equal(CACHE_POLICIES.INFINITE, cache.lifeTime);
    });

    it('Set/Get value in Cache', function () {
        const tag = [2, 0, 0];
        cache.set('a', 0, 0, 0);
        cache.set('b', 1, 0, 0);
        cache.setByArray('c', tag);
        cache.set('d', 3, 0);
        cache.set('e', 4);
        assert.equal('c', cache.getByArray(tag));
        assert.equal('d', cache.get(3, 0));
        assert.equal('e', cache.get(4));
    });

    it('delete value in Cache', function () {
        cache.delete(0, 0, 0);
        cache.delete(1, 0, 0);
        cache.delete(2, 0, 0);
        cache.delete(3, 0);
        cache.delete(4);

        assert.equal(undefined, cache.get(0, 0, 0));
        assert.equal(undefined, cache.get(1, 0, 0));
        assert.equal(undefined, cache.get(2, 0, 0));
        assert.equal(undefined, cache.get(3, 0));
        assert.equal(undefined, cache.get(4));
    });

    it('delete empty Map', function () {
        cache.set('a', 0, 0, 0);
        cache.set('b', 0, 0, 1);
        cache.set('c', 0, 0, 2);
        cache.delete(0, 0, 0);
        cache.delete(0, 0, 1);
        cache.delete(0, 0, 2);
        assert.equal(undefined, cache.get(0, 0));
        assert.equal(cache.data.size, 0);
    });

    it('Clear Cache', function () {
        cache.set('a', 0, 0, 0);
        cache.set('b', 0, 0, 1);
        cache.set('c', 0, 0, 2);
        cache.clear();
        assert.equal(0, cache.data.size);
    });

    it('flush Cache', function () {
        cache.set('a', 0, 0, 0);
        cache.lifeTime = 0;
        cache.lastTimeFlush = 0;
        cache.data.get(0).get(0).get(0).lastTimeUsed = 0;
        assert.equal(cache.data.size, 1);
        cache.flush(10);
        assert.equal(cache.data.size, 0);
    });
});
