import assert from 'assert';
import { Vector2 } from 'three';
import binaryPropertyAccessor from 'Core/3DTiles/utils/BinaryPropertyAccessor';
import { compareArrayWithEpsilon } from './utils';

describe('3D Tiles Binary Property Accessor', function () {
    it('Should parse float scalar binary array', function () {
        const refArray = [3.5, 2.1, -1.5];
        const typedArray = new Float32Array(refArray);
        const buffer = typedArray.buffer;
        const batchLength = 3;
        const byteOffset = 0;
        const componentType = 'FLOAT';
        const type = 'SCALAR';

        const parsedArray = binaryPropertyAccessor(buffer, batchLength, byteOffset, componentType, type);

        assert.ok(compareArrayWithEpsilon(parsedArray, refArray, 0.001));
    });

    it('Should parse unsigned short int vector2 binary array', function () {
        const refArray = [14, 12, 3, 5, 108, 500];
        const typedArray = new Uint16Array(refArray);
        const buffer = typedArray.buffer;
        const batchLength = 3;
        const byteOffset = 0;
        const componentType = 'UNSIGNED_SHORT';
        const type = 'VEC2';

        const parsedArray = binaryPropertyAccessor(buffer, batchLength, byteOffset, componentType, type);

        // Create expected array (array of THREE.Vector2s)
        const expectedArray = [];
        for (let i = 0; i <= refArray.length - 2; i += 2) {
            const vec2 = new Vector2();
            expectedArray.push(vec2.fromArray(refArray, i));
        }

        // Convert each vector2 to Array and compare them.
        for (let i = 0; i < parsedArray.length; i++) {
            assert.ok(compareArrayWithEpsilon(parsedArray[i].toArray(), expectedArray[i].toArray(), 0.001));
        }
    });
});
