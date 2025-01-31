import assert from 'assert';
import Potree2BinParser from 'Parser/Potree2BinParser';
import * as THREE from 'three';

describe('Potree2BinParser', function () {
    it('should correctly parse position buffer', function (done) {
        const nbPoints = 12;
        const buffer = new ArrayBuffer(nbPoints * 4 * 3);
        const dv = new DataView(buffer);
        for (let i = 0; i < nbPoints * 3; i++) {
            dv.setInt32(i * 4, i * 2, true);
        }

        const options = {
            in: {
                source: {
                    metadata: {
                        encoding: 'DEFAULT',
                        scale: [1, 1, 1],
                        offset: [0, 0, 0],
                    },
                },
                bbox: new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1)),
                numPoints: nbPoints,
            },
            out: {
                pointAttributes: {
                    attributes: [{
                        name: 'position',
                        type: {
                            name: 'int32',
                            size: 4,
                        },
                        numElements: 3,
                        byteSize: 12,
                        description: '',
                        range: [0, 0],
                        initialRange: [0, 0],
                    }],
                    vectors: [],
                },
                offset: new THREE.Vector3(),
            },
            node: {
                bbox: new THREE.Box3(),
            },
        };

        Potree2BinParser.parse(buffer, options)
            .then((data) => {
                const posAttr = data.geometry.getAttribute('position');
                assert.equal(posAttr.itemSize, 3);
                assert.ok(posAttr.array instanceof Float32Array);
                assert.equal(posAttr.array.length, nbPoints * 3);
                assert.equal(posAttr.array[0], 0);
                assert.equal(posAttr.array[11], 22);
                done();
            })
            .catch(done);
    });

    it('should correctly parse a complex buffer (positions, intensity, rgb and classification)', function (done) {
        // generate 5 points: positions, intensity, rgba, classification
        const numbyte = 3 * 4 + 2 + 3 * 2 + 1;
        const numPoints = 5;
        const buffer = new ArrayBuffer(numPoints * numbyte);
        const dv = new DataView(buffer);
        for (let i = 0; i < numPoints; i++) {
            // position
            dv.setInt32(i * numbyte + 0, 3 * i, true);
            dv.setInt32(i * numbyte + 4, 3 * i + 1, true);
            dv.setInt32(i * numbyte + 8, 3 * i + 2, true);
            // intensity
            dv.setInt16(i * numbyte + 12, 100 + i, true);
            // color
            dv.setUint8(i * numbyte + 14, 200 + 4 * i);
            dv.setUint8(i * numbyte + 16, 201 + 4 * i);
            dv.setUint8(i * numbyte + 18, 202 + 4 * i);
            // classification
            dv.setUint8(i * numbyte + 20, i * 3);
        }

        const options = {
            in: {
                source: {
                    metadata: {
                        encoding: 'DEFAULT',
                        scale: [1, 1, 1],
                        offset: [0, 0, 0],
                    },
                },
                bbox: new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1)),
                numPoints,
            },
            out: {
                pointAttributes: {
                    attributes: [{
                        name: 'position',
                        type: {
                            name: 'int32',
                            size: 4,
                        },
                        numElements: 3,
                        byteSize: 12,
                        description: '',
                        range: [0, 0],
                        initialRange: [0, 0],
                    }, {
                        name: 'intensity',
                        type: {
                            name: 'uint16',
                            size: 2,
                        },
                        numElements: 1,
                        byteSize: 2,
                        description: '',
                        range: [0, 0],
                        initialRange: [0, 0],
                    }, {
                        name: 'rgba',
                        type: {
                            name: 'uint16',
                            size: 2,
                        },
                        numElements: 3,
                        byteSize: 6,
                        description: '',
                        range: [0, 0],
                        initialRange: [0, 0],
                    }, {
                        name: 'classification',
                        type: {
                            name: 'uint8',
                            size: 1,
                        },
                        numElements: 1,
                        byteSize: 1,
                        description: '',
                        range: [0, 0],
                        initialRange: [0, 0],
                    }],
                    vectors: [],
                },
                offset: new THREE.Vector3(),
            },
            node: {
                bbox: new THREE.Box3(),
            },
        };

        Potree2BinParser.parse(buffer, options)
            .then(function (data) {
                const geom = data.geometry;
                const posAttr = geom.getAttribute('position');
                const intensityAttr = geom.getAttribute('intensity');
                const colorAttr = geom.getAttribute('color');
                const classificationAttr = geom.getAttribute('classification');

                // check position buffer
                assert.equal(posAttr.itemSize, 3);
                assert.deepStrictEqual(posAttr.array, Float32Array.of(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14));
                // check intensity
                assert.equal(intensityAttr.itemSize, 1);
                assert.deepStrictEqual(intensityAttr.potree.preciseBuffer, Uint16Array.of(100, 101, 102, 103, 104));
                // check colors
                assert.equal(colorAttr.itemSize, 4);
                assert.deepStrictEqual(colorAttr.array, Uint8Array.of(
                    200, 201, 202, 0,
                    204, 205, 206, 0,
                    208, 209, 210, 0,
                    212, 213, 214, 0,
                    216, 217, 218, 0));
                // check classif
                assert.equal(classificationAttr.itemSize, 1);
                assert.deepStrictEqual(classificationAttr.potree.preciseBuffer, Uint8Array.of(0, 3, 6, 9, 12));
                done();
            })
            .catch(done);
    });

    after(async function () {
        await Potree2BinParser.terminate();
    });
});
