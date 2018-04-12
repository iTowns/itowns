import * as THREE from 'three';
import $3dTilesHeaderParser from './3dTilesHeaderParser';

export default {
    /** @module PntsParser */
    /** Parse pnts buffer and extract THREE.Points and batch table
     * @function parse
     * @param {ArrayBuffer} buffer - the pnts buffer.
     * @param {Object} options - additional properties.
     * @return {Promise} - a promise that resolves with an object containig a THREE.Points (object3d) and a batch table (batchTable).
     *
     */
    parse(buffer, options) {
        options = options || {};
        options.magic = 'pnts';
        return $3dTilesHeaderParser.parse(buffer, options).then(data => ({
            batchTable: data.batchTable,
            object3d: parseFeatureTable(data.featureTable),
        }));
    },
    format: '3d-tiles/pnts',
    extensions: ['pnts'],
    mimetypes: ['application/octet-stream'],
    fetchtype: 'arrayBuffer',
};

function parseFeatureTable(featureTable) {
    if (!featureTable) return undefined;
    // Init geometry
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({ size: 0.05, vertexColors: THREE.VertexColors, sizeAttenuation: true });
    const json = featureTable.json;
    const buffer = featureTable.buffer;
    const POINTS_LENGTH = json.POINTS_LENGTH || 0;

    if (json.POSITION) {
        const positionArray = new Float32Array(buffer, json.POSITION.byteOffset, POINTS_LENGTH * 3);
        geometry.addAttribute('position', new THREE.BufferAttribute(positionArray, 3));
    }
    if (json.RGB) {
        const colorArray = new Uint8Array(buffer, json.RGB.byteOffset, POINTS_LENGTH * 3);
        geometry.addAttribute('color', new THREE.BufferAttribute(colorArray, 3, true));
    }
    if (json.POSITION_QUANTIZED) {
        throw new Error('For pnts loader, POSITION_QUANTIZED: not yet managed');
    }
    if (json.RGBA) {
        throw new Error('For pnts loader, RGBA: not yet managed');
    }
    if (json.RGB565) {
        throw new Error('For pnts loader, RGB565: not yet managed');
    }
    if (json.NORMAL) {
        throw new Error('For pnts loader, NORMAL: not yet managed');
    }
    if (json.NORMAL_OCT16P) {
        throw new Error('For pnts loader, NORMAL_OCT16P: not yet managed');
    }
    if (json.BATCH_ID) {
        throw new Error('For pnts loader, BATCH_ID: not yet managed');
    }
    // creation points with geometry and material
    const points = new THREE.Points(geometry, material);
    points.realPointCount = POINTS_LENGTH;

    // Add RTC feature
    if (json.RTC_CENTER) {
        points.position.fromArray(json.RTC_CENTER);
    }

    return points;
}
