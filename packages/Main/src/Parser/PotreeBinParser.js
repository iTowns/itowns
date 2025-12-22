import proj4 from 'proj4';
import * as THREE from 'three';

// See the different constants holding ordinal, name, numElements, byteSize in PointAttributes.cpp in PotreeConverter
// elementByteSize is byteSize / numElements
const POINT_ATTRIBUTES = {
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
        arrayType: Uint16Array,
        attributeName: 'intensity',
        normalized: true,
    },
    CLASSIFICATION: {
        numElements: 1,
        arrayType: Uint8Array,
        attributeName: 'classification',
        normalized: true,
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

// Find a way to factor this methode between the different PointCloud Parser
function _applyQuaternion(v, q) {
    // quaternion q is assumed to have unit length
    const vx = v[0];
    const vy = v[1];
    const vz = v[2];
    const qx = q[0];
    const qy = q[1];
    const qz = q[2];
    const qw = q[3];

    // t = 2 * cross( q.xyz, v );
    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);

    const res = [];
    // v + q.w * t + cross( q.xyz, t );
    res[0] = vx + qw * tx + qy * tz - qz * ty;
    res[1] = vy + qw * ty + qz * tx - qx * tz;
    res[2] = vz + qw * tz + qx * ty - qy * tx;

    return res;
}

for (const potreeName of Object.keys(POINT_ATTRIBUTES)) {
    const attr = POINT_ATTRIBUTES[potreeName];
    attr.potreeName = potreeName;
    attr.numByte = attr.numByte || attr.arrayType.BYTES_PER_ELEMENT;
    attr.byteSize = attr.numElements * attr.numByte;
    attr.normalized = attr.normalized || false;
    // chrome is known to perform badly when we call a method without respecting its arity
    const fnName = `getUint${attr.numByte * 8}`;
    attr.getValue = attr.numByte === 1 ?
        function getValue(view, offset) { return view[fnName](offset); } :
        function getValue(view, offset) { return view[fnName](offset, true); };
}

export default {
    /** @module PotreeBinParser */
    /** Parse .bin PotreeConverter format and convert to a THREE.BufferGeometry
     * @function parse
     * @param {ArrayBuffer} buffer - the bin buffer.
     * @param {Object} options
     * @param {string[]} options.in.pointAttributes - the point attributes information contained in cloud.js
     * @param {THREE.Vector3} options.out.origin - the origin position of the data
     * @return {Promise} - a promise that resolves with a THREE.BufferGeometry.
     *
     */
    parse: function parse(buffer, options) {
        if (!buffer) {
            throw new Error('No array buffer provided.');
        }

        const view = new DataView(buffer);
        // Format: X1,Y1,Z1,R1,G1,B1,A1,[...],XN,YN,ZN,RN,GN,BN,AN
        const source = options.in.source;
        const scale = source.scale;
        const pointAttributes = source.pointAttributes;

        // find a methode by recursion to get offset from the node id ?
        const offset = options.in.voxelOBB.natBox.min.toArray();

        const forward = (source.crs !== options.in.crs) ?
            proj4(source.crs, options.in.crs).forward :
            (x => x);
        const applyQuaternion = (source.crs !== options.in.crs) ?
            _applyQuaternion : (x => x);

        const origin = options.in.origin.toArray();
        const quaternion = options.in.rotation.toArray();

        let pointByteSize = 0;
        for (const potreeName of pointAttributes) {
            pointByteSize += POINT_ATTRIBUTES[potreeName].byteSize;
        }
        const numPoints = Math.floor(buffer.byteLength / pointByteSize);

        const geometry = new THREE.BufferGeometry();
        let elemOffset = 0;
        let attrOffset = 0;

        for (const potreeName of pointAttributes) {
            const attr = POINT_ATTRIBUTES[potreeName];
            const arrayLength = attr.numElements * numPoints;
            const array = new attr.arrayType(arrayLength);
            for (let arrayOffset = 0; arrayOffset < arrayLength; arrayOffset += attr.numElements) {
                const position = [];
                for (let elemIdx = 0; elemIdx < attr.numElements; elemIdx++) {
                    if (attr.attributeName === 'position') {
                        position.push(attr.getValue(view, attrOffset + elemIdx * attr.numByte)
                        * scale
                        + offset[elemIdx]);
                    } else {
                        array[arrayOffset + elemIdx] = attr.getValue(view, attrOffset + elemIdx * attr.numByte);
                    }
                }
                if (attr.attributeName === 'position') {
                    const [x, y, z] = forward(position);

                    const position2 = applyQuaternion([
                        x - origin[0],
                        y - origin[1],
                        z - origin[2],
                    ], quaternion);

                    array[arrayOffset + 0] = position2[0];
                    array[arrayOffset + 1] = position2[1];
                    array[arrayOffset + 2] = position2[2];
                }

                attrOffset += pointByteSize;
            }
            elemOffset += attr.byteSize;
            attrOffset = elemOffset;

            geometry.setAttribute(attr.attributeName, new THREE.BufferAttribute(array, attr.numElements, attr.normalized));
        }

        geometry.computeBoundingBox();

        return Promise.resolve(geometry);
    },
};
