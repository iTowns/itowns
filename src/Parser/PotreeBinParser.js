import * as THREE from 'three';

// See the different constants holding ordinal, name, numElements, byteSize in PointAttributes.cpp in PotreeConverter
// elementByteSize is byteSize / numElements
const POINT_ATTTRIBUTES = {
    POSITION_CARTESIAN: {
        numElements: 3,
        arrayType: Float32Array,
        attributeName: 'position',
    },
    COLOR_PACKED: {
        numElements: 4,
        arrayType: Uint8Array,
        attributeName: 'color',
        normalized: true,
    },
    INTENSITY: {
        numElements: 1,
        numByte: 2,
        // using Float32Array because Float16Array doesn't exist
        arrayType: Float32Array,
        attributeName: 'intensity',
        normalized: true,
    },
    CLASSIFICATION: {
        numElements: 1,
        arrayType: Uint8Array,
        attributeName: 'classification',
    },
    // Note: at the time of writing, PotreeConverter will only generate normals in Oct16 format
    // see PotreeConverter.cpp:121
    // we keep all the historical value to still supports old conversion
    NORMAL_SPHEREMAPPED: {
        numElements: 2,
        arrayType: Uint8Array,
        attributeName: 'sphereMappedNormal',
    },
    // see https://web.archive.org/web/20150303053317/http://lgdv.cs.fau.de/get/1602
    NORMAL_OCT16: {
        numElements: 2,
        arrayType: Uint8Array,
        attributeName: 'oct16Normal',
    },
    NORMAL: {
        numElements: 3,
        arrayType: Float32Array,
        attributeName: 'normal',
    },
};

export default {
    /** @module PotreeBinParser */
    /** Parse .bin PotreeConverter format and convert to a THREE.BufferGeometry
     * @function parse
     * @param {ArrayBuffer} buffer - the bin buffer.
     * @param {Object} pointAttributes - the point attributes information contained in layer.metadata coming from cloud.js
     * @return {Promise} - a promise that resolves with a THREE.BufferGeometry.
     *
     */
    parse: function parse(buffer, pointAttributes) {
        if (!buffer) {
            throw new Error('No array buffer provided.');
        }

        const view = new DataView(buffer);
        // Format: X1,Y1,Z1,R1,G1,B1,A1,[...],XN,YN,ZN,RN,GN,BN,AN
        let pointByteSize = 0;
        for (const potreeName of pointAttributes) {
            const attr = POINT_ATTTRIBUTES[potreeName];
            pointByteSize += attr.numElements * (attr.numByte || attr.arrayType.BYTES_PER_ELEMENT);
        }
        const numPoints = Math.floor(buffer.byteLength / pointByteSize);

        const attrs = [];
        // get the variable attributes
        for (const potreeName of pointAttributes) {
            const attr = POINT_ATTTRIBUTES[potreeName];
            const numByte = attr.numByte || attr.arrayType.BYTES_PER_ELEMENT;
            attrs.push({
                potreeName,
                numElements: attr.numElements,
                attributeName: attr.attributeName,
                normalized: attr.normalized,
                array: new attr.arrayType(attr.numElements * numPoints),
                numByte,
                // Potree stores everything as int, and uses scale + offset
                fnName: `getUint${numByte * 8}`,
            });
        }

        let offset = 0;
        for (let pntIdx = 0; pntIdx < numPoints; pntIdx++) {
            for (const attr of attrs) {
                for (let elemIdx = 0; elemIdx < attr.numElements; elemIdx++) {
                    // chrome is known to perform badly when we call a method without respecting its arity
                    // also, not using ternary because I measured a 25% perf hit on firefox doing so...
                    let value;
                    if (attr.numByte === 1) {
                        value = view[attr.fnName](offset);
                    } else {
                        value = view[attr.fnName](offset, true);
                    }
                    attr.array[pntIdx * attr.numElements + elemIdx] = value;

                    offset += attr.numByte;
                }
            }
        }

        const geometry = new THREE.BufferGeometry();
        for (const attr of attrs) {
            geometry.addAttribute(attr.attributeName, new THREE.BufferAttribute(attr.array, attr.numElements, attr.normalized));
        }

        geometry.computeBoundingBox();

        return Promise.resolve(geometry);
    },
};
