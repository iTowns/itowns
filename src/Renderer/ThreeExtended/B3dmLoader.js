import * as THREE from 'three';
import 'three/examples/js/loaders/GLTFLoader';

function B3dmLoader() {
    this.glTFLoader = new THREE.GLTFLoader();
}

const textDecoder = new TextDecoder('utf-8');
B3dmLoader.prototype.parse = function parse(buffer) {
    if (!buffer) {
        throw new Error('No array buffer provided.');
    }

    const view = new DataView(buffer, 4);   // starts after magic

    let byteOffset = 0;
    const b3dmHeader = {};

    // Magic type is unsigned char [4]
    b3dmHeader.magic = textDecoder.decode(new Uint8Array(buffer, 0, 4));

    if (b3dmHeader.magic) {
        // Version, byteLength, batchTableJSONByteLength, batchTableBinaryByteLength and batchTable types are uint32
        b3dmHeader.version = view.getUint32(byteOffset, true);
        byteOffset += Uint32Array.BYTES_PER_ELEMENT;

        b3dmHeader.byteLength = view.getUint32(byteOffset, true);
        byteOffset += Uint32Array.BYTES_PER_ELEMENT;

        b3dmHeader.FTJSONLength = view.getUint32(byteOffset, true);
        byteOffset += Uint32Array.BYTES_PER_ELEMENT;

        b3dmHeader.FTBinaryLength = view.getUint32(byteOffset, true);
        byteOffset += Uint32Array.BYTES_PER_ELEMENT;

        b3dmHeader.BTJSONLength = view.getUint32(byteOffset, true);
        byteOffset += Uint32Array.BYTES_PER_ELEMENT;

        b3dmHeader.BTBinaryLength = view.getUint32(byteOffset, true);
        byteOffset += Uint32Array.BYTES_PER_ELEMENT;

        // To test with a binary which possess a batch table
        /* if(result.header.batchTableJSONByteLength > 0) {
            var batchedTableString = this.decodeFromCharCode(array.subarray(result.byteOffset, result.byteOffset + result.header.batchTableJSONByteLength));
            result.body.batchTableJSON = JSON.parse(batchedTableString);
            result.byteOffset += result.header.batchTableJSONByteLength;
        }
        if(result.header.batchTableBinaryByteLength > 0) {
            var batchTableBinary = new Uint8Array(buffer, result.byteOffset, result.batchTableBinaryByteLength);
            batchTableBinary = new Uint8Array(batchTableBinary);
            result.byteOffset += result.header.batchTableBinaryByteLength;
        }*/

        // TODO: missing feature and batch table
        return new Promise((resolve/* , reject*/) => {
            const onload = (gltf) => {
                resolve(gltf);
            };
            this.glTFLoader.parse(buffer.slice(28 + b3dmHeader.FTJSONLength +
                b3dmHeader.FTBinaryLength + b3dmHeader.BTJSONLength +
                b3dmHeader.BTBinaryLength), onload);
        });
    } else {
        throw new Error('Invalid b3dm file.');
    }
};

export default B3dmLoader;
