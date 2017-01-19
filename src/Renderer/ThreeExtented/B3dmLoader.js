import GltfLoader from 'Renderer/ThreeExtented/GLTFLoader';

function B3dmLoader() {
    this.glTFLoader = new GltfLoader();
}

var decodeFromCharCode = function (value) {
    var result = '';
    for (var i = 0; i < value.length; i++) {
        result += String.fromCharCode(value[i]);
    }
    return result;
};

B3dmLoader.prototype.parse = function (buffer) {
    if (!buffer) {
        throw new Error('No array buffer provided.');
    }

    var array = new Uint8Array(buffer);
    var view = new DataView(buffer);

    var byteOffset = 0;
    var b3dmHeader = {};

	// Magic type is unsigned char [4]
    b3dmHeader.magic = decodeFromCharCode(array.subarray(byteOffset, 4));
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
        bgltfHeader.magic = decodeFromCharCode(array.subarray(byteOffset, byteOffset + 4));
        byteOffset += 4;

        if (bgltfHeader.magic) {
            // TODO: missing batch table
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
                    this.glTFLoader.parse(buffer.slice(24), onload);    // TODO: not alway 24 bytes
                }.bind(this));
            } else {
                throw new Error('The embeded binary gltf is invalid.');
             }
        } else {
            throw new Error('Invalid b3dm file.');
        }
    } else {
        throw new Error('Invalid b3dm file.');
    }
};

export default B3dmLoader;
