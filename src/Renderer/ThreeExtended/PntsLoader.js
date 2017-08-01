import * as THREE from 'three';
import BT from './BatchTable';

const textDecoder = new TextDecoder('utf-8');
export default {
    parse: function parse(buffer) {
        if (!buffer) {
            throw new Error('No array buffer provided.');
        }
        const view = new DataView(buffer);

        let byteOffset = 0;
        const pntsHeader = {};
        let batchTable = {};
        let point = {};

        // Magic type is unsigned char [4]
        pntsHeader.magic = textDecoder.decode(new Uint8Array(buffer, byteOffset, 4));
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

            // binary table
            if (pntsHeader.FTBinaryLength > 0) {
                point = parseFeatureBinary(buffer, byteOffset, pntsHeader.FTJSONLength);
            }

            // batch table
            if (pntsHeader.BTJSONLength > 0) {
                const sizeBegin = 28 + pntsHeader.FTJSONLength + pntsHeader.FTBinaryLength;
                batchTable = BT.parseBatchTableJSON(buffer.slice(sizeBegin, pntsHeader.BTJSONLength + sizeBegin));
            }

            const pnts = { point, batchTable };
            return pnts;
        } else {
            throw new Error('Invalid pnts file.');
        }
    },
};

function parseFeatureBinary(array, byteOffset, FTJSONLength) {
    // Init geometry
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({ size: 0.05, vertexColors: THREE.VertexColors, sizeAttenuation: true });

    // init Array feature binary
    const subArrayJson = textDecoder.decode(new Uint8Array(array, byteOffset, FTJSONLength));
    const parseJSON = JSON.parse(subArrayJson);
    let lengthFeature;
    if (parseJSON.POINTS_LENGTH) {
        lengthFeature = parseJSON.POINTS_LENGTH;
    }
    if (parseJSON.POSITION) {
        const byteOffsetPos = (parseJSON.POSITION.byteOffset + subArrayJson.length + byteOffset);
        const positionArray = new Float32Array(array, byteOffsetPos, lengthFeature * 3);
        geometry.addAttribute('position', new THREE.BufferAttribute(positionArray, 3));
    }
    if (parseJSON.RGB) {
        const byteOffsetCol = parseJSON.RGB.byteOffset + subArrayJson.length + byteOffset;
        const colorArray = new Uint8Array(array, byteOffsetCol, lengthFeature * 3);
        geometry.addAttribute('color', new THREE.BufferAttribute(colorArray, 3, true));
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
    // creation points with geometry and material
    const points = new THREE.Points(geometry, material);
    points.realPointCount = lengthFeature;

    // Add RTC feature
    if (parseJSON.RTC_CENTER) {
        points.position.fromArray(parseJSON.RTC_CENTER);
    }

    return points;
}
