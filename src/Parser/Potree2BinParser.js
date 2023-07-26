import * as THREE from 'three';

import { BrotliWorkerClass } from 'Workers/potree2-brotli-decoder';
import { DecoderWorkerClass } from 'Workers/potree2-decoder';
import BrotliWorker from 'Workers/potree2-brotli-decoder.worker';
import DecoderWorker from 'Workers/potree2-decoder.worker';

// Create enums for different types of workers
const WORKER_TYPE = {
    DECODER_WORKER_BROTLI: 'DECODER_WORKER_BROTLI',
    DECODER_WORKER: 'DECODER_WORKER',
};

const workers = {};

const runningNodeJS = typeof process !== 'undefined' && process.release && process.release.name === 'node';

function createWorker(type) {
    if (type === WORKER_TYPE.DECODER_WORKER_BROTLI) {
        if (runningNodeJS) {
            return new BrotliWorkerClass();
        } else {
            return new BrotliWorker();
        }
    } else if (type === WORKER_TYPE.DECODER_WORKER) {
        if (runningNodeJS) {
            return new DecoderWorkerClass();
        } else {
            return new DecoderWorker();
        }
    } else {
        throw new Error('Unknown worker type');
    }
}

function getWorker(type) {
    if (!workers[type]) {
        workers[type] = [];
    }

    if (workers[type].length === 0) {
        const worker = createWorker(type);
        workers[type].push(worker);
    }

    const worker = workers[type].pop();
    return worker;
}

function returnWorker(type, worker) {
    workers[type].push(worker);
}

export default {
    /** @module Potree2BinParser */
    /** Parse .bin PotreeConverter 2.0 format and convert to a THREE.BufferGeometry
     * @function parse
     * @param {ArrayBuffer} buffer - the bin buffer.
     * @param {Object} options
     * @param {string[]} options.in.pointAttributes - the point attributes information contained in metadata.js
     * @return {Promise} - a promise that resolves with a THREE.BufferGeometry.
     *
     */
    parse: function parse(buffer, options) {
        return new Promise((resolve) => {
            const metadata = options.in.source.metadata;
            const layer = options.out;

            const type = metadata.encoding === 'BROTLI' ? WORKER_TYPE.DECODER_WORKER_BROTLI : WORKER_TYPE.DECODER_WORKER;
            const worker = getWorker(type);

            worker.onmessage = (e) => {
                const data = e.data;
                const buffers = data.attributeBuffers;

                returnWorker(type, worker);

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
                        geometry.setAttribute(property, new THREE.BufferAttribute(new Float32Array(buffer), 1));
                    }
                });

                geometry.computeBoundingBox();

                resolve({ geometry, density: data.density });
            };

            const pointAttributes = layer.pointAttributes;
            const scale = metadata.scale;
            const box = options.in.bbox;
            const min = layer.offset.clone().add(box.min);
            const size = box.max.clone().sub(box.min);
            const max = min.clone().add(size);
            const offset = metadata.offset;
            const numPoints = options.in.numPoints;

            const message = {
                buffer,
                pointAttributes,
                scale,
                min,
                max,
                size,
                offset,
                numPoints,
            };

            worker.postMessage(message, [message.buffer]);
        });
    },
};
