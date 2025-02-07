import { Vector2, Vector3, Vector4 } from 'three';

/**
 * @enum {Object} componentTypeBytesSize - Size in byte of a component type.
 */
const componentTypeBytesSize = {
    BYTE: 1,
    UNSIGNED_BYTE: 1,
    SHORT: 2,
    UNSIGNED_SHORT: 2,
    INT: 4,
    UNSIGNED_INT: 4,
    FLOAT: 4,
    DOUBLE: 8,
};

/**
 * @enum {Object} componentTypeConstructor - TypedArray constructor for each 3D Tiles binary componentType
 */
const componentTypeConstructor = {
    BYTE: Int8Array,
    UNSIGNED_BYTE: Uint8Array,
    SHORT: Int16Array,
    UNSIGNED_SHORT: Uint16Array,
    INT: Int32Array,
    UNSIGNED_INT: Uint32Array,
    FLOAT: Float32Array,
    DOUBLE: Float64Array,
};


/**
 * @enum {Object} typeComponentsNumber - Number of components for a given type.
 */
const typeComponentsNumber = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
};

/**
 * @enum {Object} typeConstructor - constructor for types (only for vectors since scalar will be converted to a single
 * value)
 */
const typeConstructor = {
    // SCALAR: no constructor, just create a value (int, float, etc. depending on componentType)
    VEC2: Vector2,
    VEC3: Vector3,
    VEC4: Vector4,
};

/**
 * Parses a 3D Tiles binary property. Used for batch table and feature table parsing. See the 3D Tiles spec for more
 * information on how these values are encoded:
 * [3D Tiles spec](https://github.com/CesiumGS/3d-tiles/blob/main/specification/TileFormats/BatchTable/README.md#binary-body))
 * @param {ArrayBuffer} buffer The buffer to parse values from.
 * @param {Number} batchLength number of objects in the batch (= number of elements to parse).
 * @param {Number} byteOffset the offset in bytes into the buffer.
 * @param {String} componentType the type of component to parse (one of componentTypeBytesSize keys)
 * @param {String} type the type of element to parse (one of typeComponentsNumber keys)
 * @returns {Array} an array of values parsed from the buffer. An array of componentType if type is SCALAR. An array
 * of Threejs Vector2, Vector3 or Vector4 if type is VEC2, VEC3 or VEC4 respectively.
 */
function binaryPropertyAccessor(buffer, batchLength, byteOffset, componentType, type) {
    if (!buffer) {
        throw new Error('Buffer is mandatory to parse binary property.');
    }
    if (typeof batchLength === 'undefined' || batchLength === null) {
        throw new Error('batchLength is mandatory to parse binary property.');
    }
    if (typeof byteOffset === 'undefined' || byteOffset === null) {
        throw new Error('byteOffset is mandatory to parse binary property.');
    }
    if (!componentTypeBytesSize[componentType]) {
        throw new Error(`Uknown component type: ${componentType}. Cannot access binary property.`);
    }
    if (!typeComponentsNumber[type]) {
        throw new Error(`Uknown type: ${type}. Cannot access binary property.`);
    }

    const typeNb = typeComponentsNumber[type];
    const elementsNb = batchLength * typeNb; // Number of elements to parse in the buffer

    const typedArray = new componentTypeConstructor[componentType](buffer, byteOffset, elementsNb);

    if (type === 'SCALAR') {
        return Array.from(typedArray);
    } else {
        // return an array of threejs vectors, depending on type (see typeConstructor)
        const array = [];
        // iteration step of 2, 3 or 4, depending on the type (VEC2, VEC3 or VEC4)
        for (let i = 0; i <= typedArray.length - typeNb; i += typeNb) {
            const vector = new typeConstructor[type]();
            // Create a vector from an array, starting at the offset i and takes the right number of elements depending
            // on its type (Vector2, Vector3, Vector 4)
            vector.fromArray(typedArray, i);
            array.push(vector);
        }
        return array;
    }
}

export default binaryPropertyAccessor;
