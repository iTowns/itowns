import * as THREE from 'three';
import computeBuffers, { getBufferIndexSize } from 'Core/Prefab/computeBufferTileGeometry';

/**
 * @param {Builder} builder
 * @param {any} params
 * @returns {GpuBufferAttributes}
 */
function defaultBuffers(builder, params) {
    params.buildIndexAndUv_0 = true;
    params.center = builder.center(params.extent).clone();
    const buffers = computeBuffers(params);
    buffers.index = new THREE.BufferAttribute(buffers.index, 1);
    buffers.uvs[0] = new THREE.BufferAttribute(buffers.uvs[0], 2);
    buffers.position = new THREE.BufferAttribute(buffers.position, 3);
    buffers.normal = new THREE.BufferAttribute(buffers.normal, 3);
    for (let i = 1; i < params.builder.uvCount; i++) {
        buffers.uvs[1] = new THREE.BufferAttribute(buffers.uvs[1], 1);
    }
    return buffers;
}

class TileGeometry extends THREE.BufferGeometry {
    constructor(builder, params, buffers = defaultBuffers(builder, params)) {
        super();
        this.center = params.center;
        this.extent = params.extent;
        this.segments = params.segments;
        this.setIndex(buffers.index);
        this.setAttribute('position', buffers.position);
        this.setAttribute('normal', buffers.normal);
        this.setAttribute('uv', buffers.uvs[0]);

        for (let i = 1; i < buffers.uvs.length; i++) {
            this.setAttribute(`uv_${i}`, buffers.uvs[i]);
        }

        this.computeBoundingBox();
        this.OBB = {};
        if (params.hideSkirt) {
            this.hideSkirt = params.hideSkirt;
        }

        this._refCount = { count: -42, fn: undefined };
    }
    set hideSkirt(value) {
        this.setDrawRange(0, getBufferIndexSize(this.segments, value));
    }

    initRefCount(cacheTile, keys) {
        this._refCount.count = 0;
        this._refCount.fn = () => {
            this._refCount.count--;
            if (this._refCount.count <= 0) {
                // To avoid remove index buffer and attribute buffer uv
                //  error un-bound buffer in webgl with VAO rendering.
                // Could be removed if the attribute buffer deleting is
                //  taken into account in the buffer binding state
                //  (in THREE.WebGLBindingStates code).
                this.index = null;
                delete this.attributes.uv;
                THREE.BufferGeometry.prototype.dispose.call(this);
                cacheTile.delete(...keys);
            }
        };
    }

    // override
    dispose() {
        if (this._refCount === -42) {
            super.dispose();
        } else {
            this._refCount.fn();
        }
    }
}

export default TileGeometry;
