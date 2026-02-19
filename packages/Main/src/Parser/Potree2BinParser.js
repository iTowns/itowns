import * as THREE from 'three';
import { spawn, Thread, Transfer } from 'threads';
import { CRS, OrientationUtils, Coordinates } from '@itowns/geographic';

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

function getQuaternion(origin, crsIn, crsOut) {
    let quaternion = new THREE.Quaternion();
    if (CRS.defs(crsOut).projName === 'geocent') {
        quaternion = OrientationUtils.quaternionFromCRSToCRS(crsOut, crsIn)(origin);
    }
    return quaternion;
}

function buildBufferGeometry(attributeBuffers) {
    const geometry = new THREE.BufferGeometry();
    Object.keys(attributeBuffers).forEach((attributeName) => {
        const buffer = attributeBuffers[attributeName].buffer;

        if (attributeName === 'position') {
            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer), 3));
        } else if (attributeName === 'rgba') {
            geometry.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
        } else if (attributeName === 'NORMAL') {
            geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
        } else if (attributeName === 'INDICES') {
            const bufferAttribute = new THREE.BufferAttribute(new Uint8Array(buffer), 4);
            bufferAttribute.normalized = true;
            geometry.setAttribute('indices', bufferAttribute);
        } else {
            const bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);

            const batchAttribute = attributeBuffers[attributeName].attribute;
            bufferAttribute.potree = {
                offset: attributeBuffers[attributeName].offset,
                scale: attributeBuffers[attributeName].scale,
                preciseBuffer: attributeBuffers[attributeName].preciseBuffer,
                range: batchAttribute.range,
            };

            geometry.setAttribute(attributeName, bufferAttribute);
        }
    });

    return geometry;
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
        const potreeLoader = await loader();
        const source = options.in.source;

        const metadata = source.metadata;
        const scale = metadata.scale;
        const offset = metadata.offset;

        const pointAttributes = source.pointAttributes;

        const numPoints = options.in.numPoints;

        const centerZ0 = new Coordinates(options.in.crs).setFromVector3(
            new THREE.Vector3().applyMatrix4(options.in.clampOBB.matrixWorld),
        );

        const quaternion = getQuaternion(centerZ0, source.crs, options.in.crs);

        const config = {
            in: {
                crs: source.crs,
                projDefs: CRS.defs(source.crs),
            },
            out: {
                crs: options.in.crs,
                projDefs: CRS.defs(options.in.crs),
                origin: centerZ0.toArray(),
                rotation: quaternion.toArray(),
            },
            pointAttributes,
            scale,
            offset,
            numPoints,
        };

        const decode = decoder(potreeLoader, metadata);
        const parsedData = await decode(Transfer(buffer), config);

        const geometry = buildBufferGeometry(parsedData.attributeBuffers);

        geometry.computeBoundingBox();
        geometry.userData.position = parsedData.userData.position;
        geometry.userData.quaternion = parsedData.userData.quaternion;

        return geometry;
    },
};
