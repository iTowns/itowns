import utf8Decoder from '../utils/Utf8Decoder';

export default {
    /** @module 3dTilesHeaderParser */
    /** Parse buffer and convert to JSON
     * @function parse
     * @param {ArrayBuffer} buffer - the input buffer.
     * @param {Object} options - additional properties.
     * @param {string=} [options.magic] - magic string.
     * @return {Promise} - a promise that resolves with a 3dTilesHeader object.
     *
     */
    parse(buffer, options) {
        if (!buffer) {
            throw new Error('No array buffer provided.');
        }
        const header = {};
        const parsed = { header };

        // Magic type is unsigned char [4]
        header.magic = utf8Decoder.decode(new Uint8Array(buffer, 0, 4));
        if (header.magic !== options.magic) {
            throw new Error(`Invalid 3d-tiles header : "${header.magic}" ("${options.magic}" was expected).`);
        }

        const view = new DataView(buffer);
        let byteOffset = 4;

        header.version = view.getUint32(byteOffset, true);
        byteOffset += Uint32Array.BYTES_PER_ELEMENT;

        header.byteLength = view.getUint32(byteOffset, true);
        byteOffset += Uint32Array.BYTES_PER_ELEMENT;

        if (options.magic === 'cmpt') {
            header.tilesLength = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;
        } else {
            header.FTJSONLength = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            header.FTBinaryLength = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            header.BTJSONLength = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            header.BTBinaryLength = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            if (options.magic === 'i3dm') {
                header.gltfFormat = view.getUint32(byteOffset, true);
                byteOffset += Uint32Array.BYTES_PER_ELEMENT;
            }
        }

        parsed.header = header;

        if (header.FTJSONLength > 0) {
            const json = new Uint8Array(buffer, byteOffset, header.FTJSONLength);
            byteOffset += header.FTJSONLength;
            parsed.featureTable = { json: JSON.parse(utf8Decoder.decode(json)) };
            if (header.FTBinaryLength > 0) {
                parsed.featureTable.buffer = buffer.slice(byteOffset, byteOffset + header.FTBinaryLength);
                byteOffset += header.FTBinaryLength;
            }
        }

        if (header.BTJSONLength > 0) {
            const json = new Uint8Array(buffer, byteOffset, header.BTJSONLength);
            byteOffset += header.BTJSONLength;
            parsed.batchTable = { json: JSON.parse(utf8Decoder.decode(json)) };
            if (header.BTBinaryLength > 0) {
                parsed.batchTable.buffer = buffer.slice(byteOffset, header.BTBinaryLength);
                byteOffset += header.BTBinaryLength;
            }
        }
        parsed.byteOffset = byteOffset;
        return Promise.resolve(parsed);
    },
};
