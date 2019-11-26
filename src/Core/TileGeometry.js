import * as THREE from 'three';
import computeBuffers from 'Core/Prefab/computeBufferTileGeometry';

function defaultBuffers(params) {
    params.buildIndexAndUv_0 = true;
    params.center = params.builder.center(params.extent).clone();
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
    constructor(params, buffers = defaultBuffers(params)) {
        super();
        this.center = params.center;
        this.extent = params.extent;

        this.setIndex(buffers.index);
        this.setAttribute('position', buffers.position);
        this.setAttribute('normal', buffers.normal);

        for (let i = 0; i < buffers.uvs.length; i++) {
            this.setAttribute(`uv_${i}`, buffers.uvs[i]);
        }

        this.computeBoundingBox();
        this.OBB = {};
    }
}

export default TileGeometry;
