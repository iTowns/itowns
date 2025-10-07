import * as THREE from 'three';
import { TileGeometry } from 'Core/TileGeometry';
import { LRUCache } from 'lru-cache';
import { computeBuffers } from 'Core/Prefab/computeBufferTileGeometry';
import OBB from 'Renderer/OBB';
import type { Extent } from '@itowns/geographic';
import { Coordinates } from '@itowns/geographic';

const cacheBuffer = new Map<string, {
    index: THREE.BufferAttribute,
    uv: THREE.BufferAttribute,
}>();
const cacheTile = new LRUCache<string, Promise<TileGeometry>>({ max: 500 });

export type GpuBufferAttributes = {
    index: THREE.BufferAttribute | null;
    position: THREE.BufferAttribute;
    normal: THREE.BufferAttribute;
    uvs: THREE.BufferAttribute[];
};

/**
 * Reference to a tile's extent with rigid transformations.
 * Enables reuse of geometry, saving a bit of memory.
 */
export type ShareableExtent = {
    shareableExtent: Extent;
    quaternion: THREE.Quaternion;
    position: THREE.Vector3;
};

export interface TileBuilderParams {
    /** Whether to build the skirt. */
    disableSkirt: boolean;
    /** Whether to render the skirt. */
    hideSkirt: boolean;
    /** Number of segments (edge loops) inside tiles. */
    segments: number;
    // TODO: Move this out of the interface
    /** Buffer for projected points. */
    coordinates: Coordinates;
    extent: Extent;
    level: number;
    center: THREE.Vector3;
}

export interface TileBuilder<SpecializedParams extends TileBuilderParams> {
    crs: string;

    /** Convert builder-agnostic params to specialized ones. */
    prepare(params: TileBuilderParams): SpecializedParams;
    /**
     * Computes final offset of the second texture set.
     * Only relevant in the case of more than one texture sets.
     */
    computeExtraOffset?(params: SpecializedParams): number;
    /** Get the center of the current tile as a 3D vector. */
    center(extent: Extent): THREE.Vector3;
    /** Converts an x/y tile-space position to its equivalent in 3D space. */
    vertexPosition(coordinates: Coordinates): THREE.Vector3;
    /** Gets the geodesic normal of the last processed vertex. */
    vertexNormal(): THREE.Vector3;
    /** Project horizontal texture coordinate to world space. */
    uProject(u: number, extent: Extent): number;
    /** Project vertical texture coordinate to world space. */
    vProject(v: number, extent: Extent): number;
    /**
     * Compute shareable extent to pool geometries together.
     * The geometry of tiles on the same latitude is the same with an added
     * rigid transform.
     */
    computeShareableExtent(extent: Extent): ShareableExtent;
}

export function newTileGeometry(
    builder: TileBuilder<TileBuilderParams>,
    params: TileBuilderParams,
) {
    const { shareableExtent, quaternion, position } =
        builder.computeShareableExtent(params.extent);

    const south = shareableExtent.south.toFixed(6);

    const bufferKey =
        `${builder.crs}_${params.disableSkirt ? 0 : 1}_${params.segments}`;

    const key = `s${south}l${params.level}bK${bufferKey}`;
    let promiseGeometry = cacheTile.get(key);

    // build geometry if doesn't exist
    if (!promiseGeometry) {
        let resolve;
        promiseGeometry = new Promise((r) => { resolve = r; });
        cacheTile.set(key, promiseGeometry);

        params.extent = shareableExtent;
        params.center = builder.center(params.extent).clone();
        // Read previously cached values (index and uv.wgs84 only
        // depend on the # of triangles)
        let cachedBuffers = cacheBuffer.get(bufferKey);

        let buffers;
        try {
            buffers = computeBuffers(
                builder,
                params,
                cachedBuffers !== undefined
                    ? {
                        index: cachedBuffers.index.array as
                            Uint8Array | Uint16Array | Uint32Array,
                        uv: cachedBuffers.uv.array as Float32Array,
                    }
                    : undefined,
            );
        } catch (e) {
            return Promise.reject(e);
        }

        if (!cachedBuffers) {
            // We know the fields will exist due to the condition
            // matching with the one for buildIndexAndUv_0.
            // TODO: Make this brain-based check compiler-based.

            cachedBuffers = {
                index: new THREE.BufferAttribute(buffers.index!, 1),
                uv: new THREE.BufferAttribute(buffers.uvs[0]!, 2),
            };

            // Update cacheBuffer
            cacheBuffer.set(bufferKey, cachedBuffers);
        }

        const gpuBuffers: GpuBufferAttributes = {
            index: cachedBuffers.index,
            uvs: [
                cachedBuffers.uv,
                ...(buffers.uvs[1] !== undefined
                    ? [new THREE.BufferAttribute(buffers.uvs[1], 1)]
                    : []
                ),
            ],
            position: new THREE.BufferAttribute(buffers.position, 3),
            normal: new THREE.BufferAttribute(buffers.normal, 3),
        };

        const geometry = new TileGeometry(builder, params, gpuBuffers);
        geometry.OBB =
            new OBB(geometry.boundingBox!.min, geometry.boundingBox!.max);
        geometry.initRefCount(cacheTile, key);
        resolve!(geometry);

        return Promise.resolve({ geometry, quaternion, position });
    }

    return (promiseGeometry as Promise<TileGeometry>)
        .then(geometry => ({ geometry, quaternion, position }));
}
