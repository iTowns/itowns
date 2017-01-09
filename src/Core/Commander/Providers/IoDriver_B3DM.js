import IoDriver from 'Core/Commander/Providers/IoDriver';
import * as THREE from 'three';
import GltfLoader from 'Renderer/ThreeExtented/GLTFLoader';

function IoDriver_B3DM() {
    // Constructor
    IoDriver.call(this);
    this.GltfLoader = new THREE.GLTFLoader();
}

IoDriver_B3DM.prototype = Object.create(IoDriver.prototype);

IoDriver_B3DM.prototype.constructor = IoDriver_B3DM;

IoDriver_B3DM.prototype.decodeFromCharCode = function (value) {
    var result = '';
    for (var i = 0; i < value.length; i++)
		{ result += String.fromCharCode(value[i]); }
    return result;
};

IoDriver_B3DM.prototype.parseB3dm = function (buffer) {
    if (!buffer)
        { throw new Error('Error processing B3DM'); }

    var array = new Uint8Array(buffer);
    var view = new DataView(buffer);

    var byteOffset = 0;
    var b3dmHeader = {};

	// Magic type is unsigned char [4]
    b3dmHeader.magic = this.decodeFromCharCode(array.subarray(byteOffset, 4));
    byteOffset += 4;

    if (b3dmHeader.magic) {
		// Version, byteLength, batchTableJSONByteLength, batchTableBinaryByteLength and batchTable types are uint32
        b3dmHeader.version = view.getUint32(byteOffset, true);
        byteOffset += Uint32Array.BYTES_PER_ELEMENT;

        b3dmHeader.byteLength = view.getUint32(byteOffset, true);
        byteOffset += Uint32Array.BYTES_PER_ELEMENT;

        b3dmHeader.batchTableJSONByteLength = view.getUint32(byteOffset, true);
        byteOffset += Uint32Array.BYTES_PER_ELEMENT;

        b3dmHeader.batchTableBinaryByteLength = view.getUint32(byteOffset, true);
        byteOffset += Uint32Array.BYTES_PER_ELEMENT;

        b3dmHeader.batchLength = view.getUint32(byteOffset, true);
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

        var bgltfHeader = {};

		// Magic type is unsigned char [4]
        bgltfHeader.magic = this.decodeFromCharCode(array.subarray(byteOffset, byteOffset + 4));
        byteOffset += 4;

        if (bgltfHeader.magic) {
            // TODO: this is wrong
			// Version, length, contentLength and contentFormat types are uint32
            bgltfHeader.version = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            bgltfHeader.length = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            bgltfHeader.contentLength = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            bgltfHeader.contentFormat = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            if (bgltfHeader.contentLength > 0) {
                return new Promise(function(resolve/*, reject*/) {
                    let onload = (gltf) => {
                        resolve(gltf);
                    }
                    var gltfText = this.decodeFromCharCode(array.subarray(byteOffset, byteOffset + bgltfHeader.contentLength));
                    var binaryGltfArray = array.subarray(byteOffset + bgltfHeader.contentLength, b3dmHeader.byteLength);
                    this.GltfLoader.parse(buffer.slice(24), onload);    // TODO: not alway 24 bytes
                }.bind(this));
            } else
				{ throw new Error('The binary gltf is not a valid one.'); }
        } else {
			// ToDo
            throw new Error('The file might be a non binary gltf file.');
        }
    } else
		{ throw new Error('The b3dm is not a valid one'); }
};

IoDriver_B3DM.prototype.read = function (url) {
    return fetch(url).then((response) => {
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`Error loading ${url}: status ${response.status}`);
        }
        return response.arrayBuffer();
    }).then(buffer => this.parseB3dm(buffer));
};

export default IoDriver_B3DM;
