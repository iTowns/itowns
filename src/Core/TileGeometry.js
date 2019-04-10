import * as THREE from 'three';
import computeBuffers from 'Core/Prefab/computeBufferTileGeometry';

function defaultBuffers(params) {
    params.buildIndexAndWGS84 = true;
    params.center = params.builder.center(params.extent).clone();
    const buffers = computeBuffers(params);
    buffers.index = new THREE.BufferAttribute(buffers.index, 1);
    buffers.uv.wgs84 = new THREE.BufferAttribute(buffers.uv.wgs84, 2);
    buffers.position = new THREE.BufferAttribute(buffers.position, 3);
    buffers.normal = new THREE.BufferAttribute(buffers.normal, 3);
    buffers.uv.pm = new THREE.BufferAttribute(buffers.uv.pm, 1);
    return buffers;
}

class TileGeometry extends THREE.BufferGeometry {
    constructor(params, buffers = defaultBuffers(params)) {
        super();
        this.center = params.center;
        this.extent = params.extent;

        this.setIndex(buffers.index);
        this.addAttribute('uv_wgs84', buffers.uv.wgs84);
        this.addAttribute('position', buffers.position);
        this.addAttribute('normal', buffers.normal);
        this.addAttribute('uv_pm', buffers.uv.pm);

        this.computeBoundingBox();
        this.OBB = {};
    }
}

export default TileGeometry;
