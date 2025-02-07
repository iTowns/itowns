/*
============
== POTREE ==
============

http://potree.org

Copyright (c) 2011-2020, Markus Schütz
All rights reserved.

    Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    1. Redistributions of source code must retain the above copyright notice, this
list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

    The views and conclusions contained in the software and documentation are those
of the authors and should not be interpreted as representing official policies,
    either expressed or implied, of the FreeBSD Project.
 */

import { PointAttribute, PointAttributeTypes } from 'Core/Potree2PointAttributes';
import { decompress } from 'brotli-compress/js.mjs';

const typedArrayMapping = {
    int8: Int8Array,
    int16: Int16Array,
    int32: Int32Array,
    int64: Float64Array,
    uint8: Uint8Array,
    uint16: Uint16Array,
    uint32: Uint32Array,
    uint64: Float64Array,
    float: Float32Array,
    double: Float64Array,
};

function dealign24b(mortoncode) {
    // see https://stackoverflow.com/questions/45694690/how-i-can-remove-all-odds-bits-in-c

    // input alignment of desired bits
    // ..a..b..c..d..e..f..g..h..i..j..k..l..m..n..o..p
    let x = mortoncode;

    //          ..a..b..c..d..e..f..g..h..i..j..k..l..m..n..o..p                     ..a..b..c..d..e..f..g..h..i..j..k..l..m..n..o..p
    //          ..a.....c.....e.....g.....i.....k.....m.....o...                     .....b.....d.....f.....h.....j.....l.....n.....p
    //          ....a.....c.....e.....g.....i.....k.....m.....o.                     .....b.....d.....f.....h.....j.....l.....n.....p
    x = ((x & 0b001000001000001000001000) >> 2) | ((x & 0b000001000001000001000001) >> 0);
    //          ....ab....cd....ef....gh....ij....kl....mn....op                     ....ab....cd....ef....gh....ij....kl....mn....op
    //          ....ab..........ef..........ij..........mn......                     ..........cd..........gh..........kl..........op
    //          ........ab..........ef..........ij..........mn..                     ..........cd..........gh..........kl..........op
    x = ((x & 0b000011000000000011000000) >> 4) | ((x & 0b000000000011000000000011) >> 0);
    //          ........abcd........efgh........ijkl........mnop                     ........abcd........efgh........ijkl........mnop
    //          ........abcd....................ijkl............                     ....................efgh....................mnop
    //          ................abcd....................ijkl....                     ....................efgh....................mnop
    x = ((x & 0b000000001111000000000000) >> 8) | ((x & 0b000000000000000000001111) >> 0);
    //          ................abcdefgh................ijklmnop                     ................abcdefgh................ijklmnop
    //          ................abcdefgh........................                     ........................................ijklmnop
    //          ................................abcdefgh........                     ........................................ijklmnop
    x = ((x & 0b000000000000000000000000) >> 16) | ((x & 0b000000000000000011111111) >> 0);

    // sucessfully realigned!
    // ................................abcdefghijklmnop

    return x;
}

export default async function load(buffer, options) {
    const { pointAttributes, scale, min, size, offset, numPoints } = options;

    let bytes;
    if (numPoints === 0) {
        bytes = { buffer: new ArrayBuffer(0) };
    } else {
        try {
            bytes = await decompress(new Int8Array(buffer));
        } catch (e) {
            bytes = { buffer: new ArrayBuffer(numPoints * (pointAttributes.byteSize + 12)) };
            console.error(`problem with node ${name}: `, e);
        }
    }

    const view = new DataView(bytes.buffer);

    const attributeBuffers = {};

    const gridSize = 32;
    const grid = new Uint32Array(gridSize ** 3);
    const toIndex = (x, y, z) => {
        // min is already subtracted
        const dx = gridSize * x / size.x;
        const dy = gridSize * y / size.y;
        const dz = gridSize * z / size.z;

        const ix = Math.min(parseInt(dx, 10), gridSize - 1);
        const iy = Math.min(parseInt(dy, 10), gridSize - 1);
        const iz = Math.min(parseInt(dz, 10), gridSize - 1);

        const index = ix + iy * gridSize + iz * gridSize * gridSize;

        return index;
    };

    let numOccupiedCells = 0;
    let byteOffset = 0;
    for (const pointAttribute of pointAttributes.attributes) {
        if (['POSITION_CARTESIAN', 'position'].includes(pointAttribute.name)) {
            const buff = new ArrayBuffer(numPoints * 4 * 3);
            const positions = new Float32Array(buff);

            for (let j = 0; j < numPoints; j++) {
                const mc_0 = view.getUint32(byteOffset + 4, true);
                const mc_1 = view.getUint32(byteOffset + 0, true);
                const mc_2 = view.getUint32(byteOffset + 12, true);
                const mc_3 = view.getUint32(byteOffset + 8, true);

                byteOffset += 16;

                let X = dealign24b((mc_3 & 0x00FFFFFF) >>> 0)
                    | (dealign24b(((mc_3 >>> 24) | (mc_2 << 8)) >>> 0) << 8);

                let Y = dealign24b((mc_3 & 0x00FFFFFF) >>> 1)
                    | (dealign24b(((mc_3 >>> 24) | (mc_2 << 8)) >>> 1) << 8);


                let Z = dealign24b((mc_3 & 0x00FFFFFF) >>> 2)
                    | (dealign24b(((mc_3 >>> 24) | (mc_2 << 8)) >>> 2) << 8);


                if (mc_1 != 0 || mc_2 != 0) {
                    X = X | (dealign24b((mc_1 & 0x00FFFFFF) >>> 0) << 16)
                        | (dealign24b(((mc_1 >>> 24) | (mc_0 << 8)) >>> 0) << 24);

                    Y = Y | (dealign24b((mc_1 & 0x00FFFFFF) >>> 1) << 16)
                        | (dealign24b(((mc_1 >>> 24) | (mc_0 << 8)) >>> 1) << 24);

                    Z = Z | (dealign24b((mc_1 & 0x00FFFFFF) >>> 2) << 16)
                        | (dealign24b(((mc_1 >>> 24) | (mc_0 << 8)) >>> 2) << 24);
                }

                const x = parseInt(X, 10) * scale[0] + offset[0] - min.x;
                const y = parseInt(Y, 10) * scale[1] + offset[1] - min.y;
                const z = parseInt(Z, 10) * scale[2] + offset[2] - min.z;

                const index = toIndex(x, y, z);
                const count = grid[index]++;
                if (count === 0) {
                    numOccupiedCells++;
                }

                positions[3 * j + 0] = x;
                positions[3 * j + 1] = y;
                positions[3 * j + 2] = z;
            }

            attributeBuffers[pointAttribute.name] = {
                buffer: buff,
                attribute: pointAttribute,
            };
        } else if (['RGBA', 'rgba'].includes(pointAttribute.name)) {
            const buff = new ArrayBuffer(numPoints * 4);
            const colors = new Uint8Array(buff);

            for (let j = 0; j < numPoints; j++) {
                const mc_0 = view.getUint32(byteOffset + 4, true);
                const mc_1 = view.getUint32(byteOffset + 0, true);
                byteOffset += 8;

                const r = dealign24b((mc_1 & 0x00FFFFFF) >>> 0)
                    | (dealign24b(((mc_1 >>> 24) | (mc_0 << 8)) >>> 0) << 8);

                const g = dealign24b((mc_1 & 0x00FFFFFF) >>> 1)
                    | (dealign24b(((mc_1 >>> 24) | (mc_0 << 8)) >>> 1) << 8);

                const b = dealign24b((mc_1 & 0x00FFFFFF) >>> 2)
                    | (dealign24b(((mc_1 >>> 24) | (mc_0 << 8)) >>> 2) << 8);

                colors[4 * j + 0] = r > 255 ? r / 256 : r;
                colors[4 * j + 1] = g > 255 ? g / 256 : g;
                colors[4 * j + 2] = b > 255 ? b / 256 : b;
            }

            attributeBuffers[pointAttribute.name] = {
                buffer: buff,
                attribute: pointAttribute,
            };
        } else {
            const buff = new ArrayBuffer(numPoints * 4);
            const f32 = new Float32Array(buff);

            const TypedArray = typedArrayMapping[pointAttribute.type.name];
            const preciseBuffer = new TypedArray(numPoints);

            let [offset, scale] = [0, 1];

            const getterMap = {
                int8: view.getInt8,
                int16: view.getInt16,
                int32: view.getInt32,
                uint8: view.getUint8,
                uint16: view.getUint16,
                uint32: view.getUint32,
                float: view.getFloat32,
                double: view.getFloat64,
            };
            const getter = getterMap[pointAttribute.type.name].bind(view);

            // compute offset and scale to pack larger types into 32 bit floats
            if (pointAttribute.type.size > 4) {
                const [amin, amax] = pointAttribute.range;
                offset = amin;
                scale = 1 / (amax - amin);
            }

            for (let j = 0; j < numPoints; j++) {
                const value = getter(byteOffset, true);
                byteOffset += pointAttribute.byteSize;

                f32[j] = (value - offset) * scale;
                preciseBuffer[j] = value;
            }

            attributeBuffers[pointAttribute.name] = {
                buffer: buff,
                preciseBuffer,
                attribute: pointAttribute,
                offset,
                scale,
            };
        }
    }

    const occupancy = parseInt(numPoints / numOccupiedCells, 10);

    { // add indices
        const buff = new ArrayBuffer(numPoints * 4);
        const indices = new Uint32Array(buff);

        for (let i = 0; i < numPoints; i++) {
            indices[i] = i;
        }

        attributeBuffers.INDICES = {
            buffer: buff,
            attribute: PointAttribute.INDICES,
        };
    }


    { // handle attribute vectors
        const vectors = pointAttributes.vectors;

        for (const vector of vectors) {
            const {
                name,
                attributes,
            } = vector;
            const numVectorElements = attributes.length;
            const buffer = new ArrayBuffer(numVectorElements * numPoints * 4);
            const f32 = new Float32Array(buffer);

            let iElement = 0;
            for (const sourceName of attributes) {
                const sourceBuffer = attributeBuffers[sourceName];
                const {
                    offset,
                    scale,
                } = sourceBuffer;
                const view = new DataView(sourceBuffer.buffer);

                const getter = view.getFloat32.bind(view);

                for (let j = 0; j < numPoints; j++) {
                    const value = getter(j * 4, true);

                    f32[j * numVectorElements + iElement] = (value / scale) + offset;
                }

                iElement++;
            }

            const vecAttribute = new PointAttribute(name, PointAttributeTypes.DATA_TYPE_FLOAT, 3);

            attributeBuffers[name] = {
                buffer,
                attribute: vecAttribute,
            };
        }
    }

    return {
        buffer,
        attributeBuffers,
        density: occupancy,
    };
}
