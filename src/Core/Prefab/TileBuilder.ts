import * as THREE from 'three';
import { TileGeometry } from 'Core/TileGeometry';
import Cache from 'Core/Scheduler/Cache';
import { computeBuffers } from 'Core/Prefab/computeBufferTileGeometry';
import OBB from 'Renderer/OBB';
import type Extent from 'Core/Geographic/Extent';

const cacheBuffer = new Map<string, { [buf: string]: THREE.BufferAttribute }>();
const cacheTile = new Cache();

export type GpuBufferAttributes = {
    index: THREE.BufferAttribute | null;
    position: THREE.BufferAttribute;
    normal: THREE.BufferAttribute;
    uvs: THREE.BufferAttribute[];
};

export type ShareableExtent = {
    shareableExtent: Extent;
    quaternion: THREE.Quaternion;
    position: THREE.Vector3;
};

// TODO: Check if this order is right
// Ideally we split this into Vec2 and a simpler LatLon type
// Somewhat equivalent to a light Coordinates class
export class Projected extends THREE.Vector2 {
    public get longitude(): number {
        return this.x;
    }

    public set longitude(longitude: number) {
        this.x = longitude;
    }

    public get latitude(): number {
        return this.y;
    }

    public set latitude(latitude: number) {
        this.y = latitude;
    }
}

export interface TileBuilderParams {
    /** Whether to build the skirt. */
    disableSkirt: boolean;
    /** Whether to render the skirt. */
    hideSkirt: boolean;
    buildIndexAndUv_0: boolean;
    /** Number of segments (edge loops) inside tiles. */
    segments: number;
    /** Buffer for projected points. */
    projected: Projected;
    extent: Extent;
    level: number;
    zoom: number;
    center: THREE.Vector3;
}

export interface TileBuilder<SpecializedParams extends TileBuilderParams> {
    crs: string;

    /** Convert builder-agnostic params to specialized ones. */
    prepare(params: TileBuilderParams): SpecializedParams;
    computeExtraOffset?: (params: SpecializedParams) => number;
    /** Get the center of the tile in 3D cartesian coordinates. */
    center(extent: Extent): THREE.Vector3;
    vertexPosition(position: THREE.Vector2): THREE.Vector3;
    vertexNormal(): THREE.Vector3;
    uProject(u: number, extent: Extent): number;
    vProject(v: number, extent: Extent): number;
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

    let promiseGeometry = cacheTile.get(south, params.level, bufferKey);
    // let promiseGeometry;

    // build geometry if doesn't exist
    if (!promiseGeometry) {
        let resolve;
        promiseGeometry = new Promise((r) => { resolve = r; });
        cacheTile.set(promiseGeometry, south, params.level, bufferKey);

        params.extent = shareableExtent;
        params.center = builder.center(params.extent).clone();
        // Read previously cached values (index and uv.wgs84 only
        // depend on the # of triangles)
        let cachedBuffers = cacheBuffer.get(bufferKey);
        params.buildIndexAndUv_0 = !cachedBuffers;
        let buffers;
        try {
            buffers = computeBuffers(builder, params);
        } catch (e) {
            return Promise.reject(e);
        }

        if (!cachedBuffers) {
            cachedBuffers = {};
            // We know the fields will exist due to the condition
            // matching with the one for buildIndexAndUv_0.
            // TODO: Make this brain-based check compiler-based.
            cachedBuffers.index = new THREE.BufferAttribute(buffers.index!, 1);
            cachedBuffers.uv = new THREE.BufferAttribute(buffers.uvs[0]!, 2);

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
        geometry.initRefCount(cacheTile, [south, params.level, bufferKey]);
        resolve!(geometry);

        return Promise.resolve({ geometry, quaternion, position });
    }

    return (promiseGeometry as Promise<TileGeometry>)
        .then(geometry => ({ geometry, quaternion, position }));
}
