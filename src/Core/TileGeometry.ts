import * as THREE from 'three';

import { computeBuffers, getBufferIndexSize }
    from 'Core/Prefab/computeBufferTileGeometry';
import { GpuBufferAttributes, Projected, TileBuilder, TileBuilderParams }
    from 'Core/Prefab/TileBuilder';
import Extent from 'Core/Geographic/Extent';
import Cache from 'Core/Scheduler/Cache';

import OBB from 'Renderer/OBB';

type PartialTileBuilderParams =
    Pick<TileBuilderParams, 'extent' | 'level' | 'zoom'>
    & Partial<TileBuilderParams>;

function defaultBuffers(
    builder: TileBuilder<TileBuilderParams>,
    params: PartialTileBuilderParams,
): GpuBufferAttributes {
    const fullParams = {
        disableSkirt: false,
        hideSkirt: false,
        buildIndexAndUv_0: true,
        segments: 16,
        projected: new Projected(0, 0),
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

export class TileGeometry extends THREE.BufferGeometry {
    public OBB: OBB | null;
    public extent: Extent;
    public segments: number;
    public tileCenter: THREE.Vector3;

    private _refCount: {
        count: number,
        fn: () => void,
    } | null;

    public constructor(
        builder: TileBuilder<TileBuilderParams>,
        params: TileBuilderParams,
        bufferAttributes: GpuBufferAttributes = defaultBuffers(builder, params),
    ) {
        super();
        this.tileCenter = params.center;
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
        if (params.hideSkirt) {
            this.hideSkirt = params.hideSkirt;
        }

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
     * Initialize reference count for this geometry.
     * Idempotent operation.
     *
     * @param cacheTile - The [Cache] used to store this geometry.
     * @param keys - The [south, level, epsg] key of this geometry.
     */
    public initRefCount(
        cacheTile: Cache,
        keys: [string, number, string],
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
                    cacheTile.delete(...keys);
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
