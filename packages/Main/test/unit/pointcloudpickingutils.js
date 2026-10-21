import assert from 'assert';
import {
    allocatePickingIds,
    releasePickingIds,
    releaseObjectPickingIds,
} from 'Utils/PointCloudPickingUtils';

describe('PointCloudPickingUtils', function () {
    // The allocator holds module level state: release everything allocated by a
    // test so the next one starts from a clean state.
    let allocated = [];

    function allocate(count) {
        const baseId = allocatePickingIds(count);
        if (baseId >= 0) {
            allocated.push(baseId);
        }
        return baseId;
    }

    afterEach(function () {
        allocated.forEach(baseId => releasePickingIds(baseId));
        allocated = [];
    });

    it('allocates contiguous non-overlapping ranges', function () {
        const a = allocate(10);
        const b = allocate(5);
        const c = allocate(1);

        assert.ok(a > 0, 'ids must not start at 0, which is the "no pick" value');
        assert.strictEqual(b, a + 10);
        assert.strictEqual(c, b + 5);
    });

    it('returns -1 for a non positive count', function () {
        assert.strictEqual(allocatePickingIds(0), -1);
        assert.strictEqual(allocatePickingIds(-3), -1);
    });

    it('returns -1 when no range is large enough', function () {
        assert.strictEqual(allocatePickingIds(2 ** 32), -1);
    });

    it('reuses a released range', function () {
        const a = allocate(10);
        const b = allocate(10);

        releasePickingIds(a);
        allocated = allocated.filter(id => id !== a);

        const c = allocate(10);
        assert.strictEqual(c, a, 'the freed range should be reused');

        const d = allocate(10);
        assert.strictEqual(d, b + 10, 'the next range is allocated after the last one');
    });

    it('only reuses a hole big enough to hold the request', function () {
        const a = allocate(4);
        const b = allocate(20);

        releasePickingIds(a);
        allocated = allocated.filter(id => id !== a);

        // Too big for the 4 ids hole left by `a`, must go after `b`.
        const c = allocate(5);
        assert.strictEqual(c, b + 20);

        // Fits exactly in the hole left by `a`.
        const d = allocate(4);
        assert.strictEqual(d, a);
    });

    it('ignores the release of an unknown base id', function () {
        const a = allocate(10);

        releasePickingIds(a + 3);
        releasePickingIds(a + 1000);

        // `a` is still allocated, so the next range comes after it.
        assert.strictEqual(allocate(10), a + 10);
    });

    it('releases the ids owned by an object', function () {
        const a = allocate(10);
        const points = { baseId: a };

        releaseObjectPickingIds(points);
        allocated = allocated.filter(id => id !== a);

        assert.strictEqual(points.baseId, undefined);
        assert.strictEqual(allocate(10), a, 'the range owned by the object is free again');
    });

    it('does nothing when the object owns no ids', function () {
        const a = allocate(10);
        const points = {};

        releaseObjectPickingIds(points);

        assert.strictEqual(points.baseId, undefined);
        assert.strictEqual(allocate(10), a + 10, 'no range was released');
    });
});
