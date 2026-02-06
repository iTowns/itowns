import assert from 'assert';
import PotreeBinParser from 'Parser/PotreeBinParser';
import * as THREE from 'three';

describe('PotreeBinParser', function () {
    const crs = 'EPSG:3857';

    it('should correctly parse position buffer', function (done) {
        const nbPoints = 12;
        const bufferDim = 4;// int32
        const spatialDim = 3;// x, y, z
        const buffer = new ArrayBuffer(nbPoints * bufferDim * spatialDim);
        const dv = new DataView(buffer);
        for (let i = 0; i < nbPoints; i++) {
            dv.setInt32((i * spatialDim + 0) * bufferDim, i * 2, true);
            dv.setInt32((i * spatialDim + 1) * bufferDim, i * 2, true);
            dv.setInt32((i * spatialDim + 2) * bufferDim, i * 2, true);
        }
        const valPositionMax = (nbPoints - 1) * 2;

        const options = {
            in: {
                source: {
                    pointAttributes: ['POSITION_CARTESIAN'],
                    scale: 1,
                    crs,
                },
                crs,
                voxelOBB: {
                    box3D: new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(valPositionMax, valPositionMax, valPositionMax)),
                    natBox: new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(valPositionMax, valPositionMax, valPositionMax)),
                },
                clampOBB: {
                    center: new THREE.Vector3(valPositionMax * 0.5, valPositionMax * 0.5, valPositionMax * 0.5),
                },
            },
        };

        PotreeBinParser.parse(buffer, options)
            .then((geom) => {
                const posAttr = geom.getAttribute('position');
                assert.equal(posAttr.itemSize, 3);
                assert.ok(posAttr.array instanceof Float32Array);
                const origin = geom.userData.position;
                assert.equal(posAttr.array.length, nbPoints * spatialDim);
                assert.equal(posAttr.array[0], 0 - origin.x);
                assert.equal(posAttr.array[2], 0 - origin.z);
                assert.equal(posAttr.array[33], valPositionMax - origin.x);
                assert.equal(posAttr.array[35], valPositionMax - origin.z);
                done();
            })
            .catch(done);
    });

    it('should correctly parse a complex buffer (positions, intensity, rgb and classification)', function (done) {
        // generate 12 points: positions, intensity, rgba, classification
        const numbyte = 3 * 4 + 2 + 4 * 1 + 1;
        const numPoints = 5;
        const buffer = new ArrayBuffer(numPoints * numbyte);
        const dv = new DataView(buffer);
        for (let i = 0; i < numPoints; i++) {
            // position
            dv.setInt32(i * numbyte + 0, 2 * i + 1, true);// to avoid 0 for the deepStrictEqual
            dv.setInt32(i * numbyte + 4, 2 * i + 1, true);
            dv.setInt32(i * numbyte + 8, 2 * i + 1, true);
            // intensity
            dv.setInt16(i * numbyte + 12, 100 + i, true);
            // color
            dv.setUint8(i * numbyte + 14, 200 + 4 * i);
            dv.setUint8(i * numbyte + 15, 201 + 4 * i);
            dv.setUint8(i * numbyte + 16, 202 + 4 * i);
            dv.setUint8(i * numbyte + 17, 203 + 4 * i);

            // classification
            dv.setUint8(i * numbyte + 18, i * 3);
        }
        const valPositionMax = numPoints * 2 - 1;

        const options = {
            in: {
                source: {
                    pointAttributes: ['POSITION_CARTESIAN', 'INTENSITY', 'COLOR_PACKED', 'CLASSIFICATION'],
                    scale: 1,
                    crs,
                },
                crs,
                voxelOBB: {
                    box3D: new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(valPositionMax, valPositionMax, valPositionMax)),
                    natBox: new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(valPositionMax, valPositionMax, valPositionMax)),
                },
                clampOBB: {
                    center: new THREE.Vector3(),
                },
            },
        };

        PotreeBinParser.parse(buffer, options)
            .then(function (geom) {
                const posAttr = geom.getAttribute('position');
                const intensityAttr = geom.getAttribute('intensity');
                const colorAttr = geom.getAttribute('color');
                const classificationAttr = geom.getAttribute('classification');

                // check position buffer
                assert.equal(posAttr.itemSize, 3);
                assert.deepStrictEqual(posAttr.array,
                    Float32Array.of(1, 1, 1, 3, 3, 3, 5, 5, 5, 7, 7, 7, 9, 9, 9),
                    'positions',
                );
                // check intensity
                assert.equal(intensityAttr.itemSize, 1);
                assert.deepStrictEqual(intensityAttr.array, Uint16Array.of(100, 101, 102, 103, 104));
                // check colors
                assert.equal(colorAttr.itemSize, 4);
                assert.deepStrictEqual(colorAttr.array, Uint8Array.of(
                    200, 201, 202, 203,
                    204, 205, 206, 207,
                    208, 209, 210, 211,
                    212, 213, 214, 215,
                    216, 217, 218, 219));
                // check classif
                assert.equal(classificationAttr.itemSize, 1);
                assert.deepStrictEqual(classificationAttr.array, Uint8Array.of(0, 3, 6, 9, 12));
                done();
            })
            .catch(done);
    });
});
