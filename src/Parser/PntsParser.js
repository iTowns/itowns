import * as THREE from 'three';
import utf8Decoder from 'Utils/Utf8Decoder';

import C3DTBatchTable from 'Core/3DTiles/C3DTBatchTable';

export default {
    /** @module PntsParser */
    /** Parse pnts buffer and extract THREE.Points and batch table
     * @function parse
     * @param {ArrayBuffer} buffer - the pnts buffer.
     * @param {Object} registeredExtensions - 3D Tiles extensions registered
     * in the layer
     * @return {Promise} - a promise that resolves with an object containig a THREE.Points (point) and a batch table (batchTable).
     *
     */
    parse: function parse(buffer, registeredExtensions) {
        if (!buffer) {
            throw new Error('No array buffer provided.');
        }
        const view = new DataView(buffer);

        let byteOffset = 0;
        const pntsHeader = {};
        let batchTable = {};
        let point = {};

        // Magic type is unsigned char [4]
        pntsHeader.magic = utf8Decoder.decode(new Uint8Array(buffer, byteOffset, 4));
        byteOffset += 4;

        if (pntsHeader.magic) {
            // Version, byteLength, batchTableJSONByteLength, batchTableBinaryByteLength and batchTable types are uint32
            pntsHeader.version = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            pntsHeader.byteLength = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            pntsHeader.FTJSONLength = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            pntsHeader.FTBinaryLength = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            pntsHeader.BTJSONLength = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            pntsHeader.BTBinaryLength = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            // feature table
            let FTJSON = {};
            if (pntsHeader.FTJSONLength > 0) {
                const sizeBegin = byteOffset;
                const jsonBuffer = buffer.slice(sizeBegin, pntsHeader.FTJSONLength + sizeBegin);
                const content = utf8Decoder.decode(new Uint8Array(jsonBuffer));
                FTJSON = JSON.parse(content);
            }

            // binary table
            if (pntsHeader.FTBinaryLength > 0) {
                point = parseFeatureBinary(buffer, byteOffset, pntsHeader.FTJSONLength);
            }

            // batch table
            if (pntsHeader.BTJSONLength > 0) {
                // parse batch table
                const sizeBegin = byteOffset + pntsHeader.FTJSONLength + pntsHeader.FTBinaryLength;
                const BTBuffer = buffer.slice(sizeBegin, pntsHeader.BTJSONLength + sizeBegin);
                batchTable = new C3DTBatchTable(BTBuffer, pntsHeader.BTBinaryLength, FTJSON.BATCH_LENGTH, registeredExtensions);
            }

            const pnts = { point, batchTable };
            return Promise.resolve(pnts);
        } else {
            throw new Error('Invalid pnts file.');
        }
    },
};

function parseFeatureBinary(array, byteOffset, FTJSONLength) {
    // Init geometry
    const geometry = new THREE.BufferGeometry();

    // init Array feature binary
    const subArrayJson = utf8Decoder.decode(new Uint8Array(array, byteOffset, FTJSONLength));
    const parseJSON = JSON.parse(subArrayJson);
    let lengthFeature;
    if (parseJSON.POINTS_LENGTH) {
        lengthFeature = parseJSON.POINTS_LENGTH;
    }
    if (parseJSON.POSITION) {
        const byteOffsetPos = (parseJSON.POSITION.byteOffset + subArrayJson.length + byteOffset);
        const positionArray = new Float32Array(array, byteOffsetPos, lengthFeature * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
    }
    if (parseJSON.RGB) {
        const byteOffsetCol = parseJSON.RGB.byteOffset + subArrayJson.length + byteOffset;
        const colorArray = new Uint8Array(array, byteOffsetCol, lengthFeature * 3);
        geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3, true));
    }
    if (parseJSON.POSITION_QUANTIZED) {
        throw new Error('For pnts loader, POSITION_QUANTIZED: not yet managed');
    }
    if (parseJSON.RGBA) {
        throw new Error('For pnts loader, RGBA: not yet managed');
    }
    if (parseJSON.RGB565) {
        throw new Error('For pnts loader, RGB565: not yet managed');
    }
    if (parseJSON.NORMAL) {
        throw new Error('For pnts loader, NORMAL: not yet managed');
    }
    if (parseJSON.NORMAL_OCT16P) {
        throw new Error('For pnts loader, NORMAL_OCT16P: not yet managed');
    }
    if (parseJSON.BATCH_ID) {
        throw new Error('For pnts loader, BATCH_ID: not yet managed');
    }

    // Add RTC feature
    const offset = parseJSON.RTC_CENTER ?
        new THREE.Vector3().fromArray(parseJSON.RTC_CENTER) : undefined;

    return {
        geometry,
        offset,
    };
}
