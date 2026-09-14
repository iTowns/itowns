/**
 * Picking ids allocator for point clouds.
 *
 * Picking is implemented by rendering a unique 32 bits id per point into an
 * RGBA8 buffer. Instead of splitting those 32 bits into a fixed
 * `16 bits object id | 16 bits point index` layout - which limits a node to
 * 65535 points and a layer to 65535 nodes - each `THREE.Points` object is given
 * a contiguous range of ids `[baseId, baseId + count)`. A point is then
 * identified by `baseId + index`, and the owning object is the one whose range
 * contains the decoded id.
 *
 * Ranges are released when a node is disposed and reused by later allocations,
 * so the only limit is the number of points simultaneously loaded (2^32).
 */

import * as THREE from 'three';

/** A half-open range of picking ids `[start, end)`. */
interface PickingIdRange {
    start: number;
    end: number;
}

/** An object that may own a range of picking ids. */
export interface PickablePointsObject extends THREE.Points {
    baseId?: number;
}

// Number of distinct values encodable on 32 bits.
const PICKING_ID_LIMIT = 2 ** 32;

/** Allocated ranges, kept sorted by `start` and non-overlapping. */
const allocatedRanges: PickingIdRange[] = [];

/**
 * Reserve a contiguous range of `count` picking ids.
 *
 * @param count - Number of ids to reserve.
 * @returns The first id of the reserved range, or `-1` if there is no free
 * range large enough.
 */
export function allocatePickingIds(count: number): number {
    if (count <= 0) {
        return -1;
    }

    let start = 1;
    for (let i = 0; i < allocatedRanges.length; i++) {
        const range = allocatedRanges[i];
        if (range.start - start >= count) {
            allocatedRanges.splice(i, 0, { start, end: start + count });
            return start;
        }
        start = range.end;
    }

    const end = start + count;
    if (end > PICKING_ID_LIMIT) {
        return -1;
    }

    allocatedRanges.push({ start, end });
    return start;
}

/**
 * Give back a range previously reserved by {@link allocatePickingIds}, making
 * its ids available again.
 *
 * @param baseId - The first id of the range to release.
 */
export function releasePickingIds(baseId: number): void {
    for (let i = 0; i < allocatedRanges.length; i++) {
        if (allocatedRanges[i].start === baseId) {
            allocatedRanges.splice(i, 1);
            return;
        }
        if (allocatedRanges[i].start > baseId) {
            return;
        }
    }
}

/**
 * Release the picking ids owned by a `THREE.Points` object, if any.
 *
 * @param pointsObj - The object being disposed.
 */
export function releaseObjectPickingIds(pointsObj: PickablePointsObject): void {
    if (pointsObj.baseId === undefined) {
        return;
    }
    releasePickingIds(pointsObj.baseId);
    pointsObj.baseId = undefined;
}
