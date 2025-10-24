import * as THREE from 'three';
import { spawn, Thread, Transfer } from 'threads';
import proj4 from 'proj4';

let _thread;

function workerInstance() {
    return new Worker(
        /* webpackChunkName: "itowns_potree2worker" */
        new URL('../Worker/Potree2Worker.js', import.meta.url),
        { type: 'module' },
    );
}

async function loader() {
    if (_thread) { return _thread; }
    _thread = await spawn(workerInstance());
    return _thread;
}

function decoder(w, metadata) {
    return metadata.encoding === 'BROTLI' ? w.parseBrotli : w.parse;
}

export default {
    /**
     * @return {Promise<void>}
     */
    terminate() {
        const currentThread = _thread;
        _thread = undefined;
        return Thread.terminate(currentThread);
    },

    /** @module Potree2BinParser */
    /** Parse .bin PotreeConverter 2.0 format and convert to a THREE.BufferGeometry
     * @function parse
     * @param {ArrayBuffer} buffer - the bin buffer.
     * @param {Object} options
     * @param {string[]} options.in.pointAttributes - the point attributes information contained in metadata.js
     * @param {THREE.Box3} options.in.bbox - the bbox of the node
     * @param {THREE.Vector3} options.out.origin - the origin position of the data
     *
     * @return {Promise} - a promise that resolves with a THREE.BufferGeometry.
     */
    parse: async function parse(buffer, options) {
        const source = options.in.source;
        const metadata = source.metadata;
        const pointAttributes = source.pointAttributes;
        const scale = metadata.scale;
        const box = options.in.voxelOBB.box3D;
        const min = box.min;
        const size = box.max.clone().sub(box.min);
        const max = box.max;
        const offset = metadata.offset;
        const numPoints = options.in.numPoints;

        const potreeLoader = await loader();
        const decode = decoder(potreeLoader, metadata);

        const origin = options.in.origin;
        const quaternion = options.in.rotation;

        const data = await decode(Transfer(buffer), {
            in: {
                crs: source.crs,
                projDefs: proj4.defs(source.crs),
            },
            out: {
                crs: options.in.crs,
                projDefs: proj4.defs(options.in.crs),
                origin: origin.toArray(),
                rotation: quaternion.toArray(),
            },
            pointAttributes,
            scale,
            min,
            max,
            size,
            offset,
            numPoints,
        });

        const buffers = data.attributeBuffers;
        const geometry = new THREE.BufferGeometry();
        Object.keys(buffers).forEach((property) => {
            const buffer = buffers[property].buffer;

            if (property === 'position') {
                geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer), 3));
            } else if (property === 'rgba') {
                geometry.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
            } else if (property === 'NORMAL') {
                geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
            } else if (property === 'INDICES') {
                const bufferAttribute = new THREE.BufferAttribute(new Uint8Array(buffer), 4);
                bufferAttribute.normalized = true;
                geometry.setAttribute('indices', bufferAttribute);
            } else {
                const bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);

                const batchAttribute = buffers[property].attribute;
                bufferAttribute.potree = {
                    offset: buffers[property].offset,
                    scale: buffers[property].scale,
                    preciseBuffer: buffers[property].preciseBuffer,
                    range: batchAttribute.range,
                };

                geometry.setAttribute(property, bufferAttribute);
            }
        });

        geometry.userData.origin = origin;
        geometry.userData.rotation = quaternion;

        geometry.computeBoundingBox();

        return { geometry, density: data.density };
    },
};
