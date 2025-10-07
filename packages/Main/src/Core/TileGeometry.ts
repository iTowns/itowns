import * as THREE from 'three';

import { computeBuffers, getBufferIndexSize }
    from 'Core/Prefab/computeBufferTileGeometry';
import { GpuBufferAttributes, TileBuilder, TileBuilderParams }
    from 'Core/Prefab/TileBuilder';
import { Coordinates, Extent } from '@itowns/geographic';
import { LRUCache } from 'lru-cache';

import OBB from 'Renderer/OBB';

type PartialParams<
    Params extends TileBuilderParams,
    Keys extends keyof Params = 'extent' | 'level'
> = Pick<Params, Keys> & Partial<Params>;

function defaultBuffers(
    builder: TileBuilder<TileBuilderParams>,
    params: PartialParams<TileBuilderParams>,
): GpuBufferAttributes {
    const fullParams = {
        disableSkirt: false,
        hideSkirt: false,
        buildIndexAndUv_0: true,
        segments: 16,
        coordinates: new Coordinates(builder.crs),
        center: builder.center(params.extent!).clone(),
        ...params,
    };

    const buffers = computeBuffers(builder, fullParams);
    const bufferAttributes = {
        index: buffers.index
            ? new THREE.BufferAttribute(buffers.index, 1)
            : null,
        uvs: [
            ...(buffers.uvs[0]
                ? [new THREE.BufferAttribute(buffers.uvs[0], 2)]
                : []
            ),
            ...(buffers.uvs[1]
                ? [new THREE.BufferAttribute(buffers.uvs[1], 1)]
                : []),
        ],
        position: new THREE.BufferAttribute(buffers.position, 3),
        normal: new THREE.BufferAttribute(buffers.normal, 3),
    };

    return bufferAttributes;
}

export class TileGeometry<
    BuilderParams extends TileBuilderParams = TileBuilderParams
> extends THREE.BufferGeometry {
    /** Oriented Bounding Box of the tile geometry. */
    public OBB: OBB | null;
    /** Ground area covered by this tile geometry. */
    public extent: Extent;
    /** Resolution of the tile geometry in segments per side. */
    public segments: number;

    /**
     * [TileGeometry] instances are shared between tiles. Since a geometry
     * handles its own GPU resource, it needs a reference counter to dispose of
     * that resource only when it is discarded by every single owner of a
     * reference to the geometry.
     */
    // https://github.com/iTowns/itowns/pull/2440#discussion_r1860743294
    // TODO: Remove nullability by reworking OBB:setFromExtent
    private _refCount: {
        count: number,
        fn: () => void,
    } | null;

    public constructor(
        builder: TileBuilder<BuilderParams>,
        params: PartialParams<BuilderParams, 'extent' | 'level' | 'segments'>,
        bufferAttributes: GpuBufferAttributes = defaultBuffers(builder, params),
    ) {
        super();
        this.extent = params.extent;
        this.segments = params.segments;
        this.setIndex(bufferAttributes.index);
        this.setAttribute('position', bufferAttributes.position);
        this.setAttribute('normal', bufferAttributes.normal);
        this.setAttribute('uv', bufferAttributes.uvs[0]);

        for (let i = 1; i < bufferAttributes.uvs.length; i++) {
            this.setAttribute(`uv_${i}`, bufferAttributes.uvs[i]);
        }

        this.computeBoundingBox();
        this.OBB = null;
        this.hideSkirt = params.hideSkirt ?? false;

        this._refCount = null;
    }

    /**
     * Enables or disables skirt rendering.
     *
     * @param toggle - Whether to hide the skirt; true hides, false shows.
     */
    public set hideSkirt(toggle: boolean) {
        this.setDrawRange(0, getBufferIndexSize(this.segments, toggle));
    }

    /**
     * Initialize reference count for this geometry if it is currently null.
     *
     * @param cacheTile - The [Cache] used to store this geometry.
     * @param keys - The [south, level, epsg] key of this geometry.
     */
    public initRefCount(
        cacheTile: LRUCache<string, Promise<this>>,
        key: string,
    ): void {
        if (this._refCount !== null) {
            return;
        }

        this._refCount = {
            count: 0,
            fn: () => {
                this._refCount!.count--;
                if (this._refCount!.count <= 0) {
                    // To avoid remove index buffer and attribute buffer uv
                    //  error un-bound buffer in webgl with VAO rendering.
                    // Could be removed if the attribute buffer deleting is
                    //  taken into account in the buffer binding state
                    //  (in THREE.WebGLBindingStates code).
                    this.index = null;
                    delete this.attributes.uv;
                    cacheTile.delete(key);
                    super.dispose();
                    // THREE.BufferGeometry.prototype.dispose.call(this);
                }
            },
        };
    }

    /**
     * Increase reference count.
     *
     * @throws If reference count has not been initialized.
     */
    public increaseRefCount(): void {
        if (this._refCount === null) {
            throw new Error('[TileGeometry::increaseRefCount] '
                + 'Tried to increment an unitialized reference count.');
        }
        this._refCount.count++;
    }

    /**
     * The current reference count of this [TileGeometry] if it has been
     * initialized.
     */
    public get refCount(): number | undefined {
        return this._refCount?.count;
    }

    public override dispose(): void {
        if (this._refCount == null) {
            super.dispose();
        } else {
            this._refCount.fn();
        }
    }
}
