import * as THREE from 'three';
import { GLTFLoader } from 'ThreeExtended/loaders/GLTFLoader';
import LegacyGLTFLoader from 'Parser/deprecated/LegacyGLTFLoader';
import utf8Decoder from 'Utils/Utf8Decoder';
import C3DTBatchTable from 'Core/3DTiles/C3DTBatchTable';

import GLTFParser from './GLTFParser';

const matrixChangeUpVectorZtoY = (new THREE.Matrix4()).makeRotationX(Math.PI / 2);
// For gltf rotation
const matrixChangeUpVectorZtoX = (new THREE.Matrix4()).makeRotationZ(-Math.PI / 2);

export const glTFLoader = new GLTFLoader();

export const legacyGLTFLoader = new LegacyGLTFLoader();

/**
 * @module B3dmParser
 */

export default {
    /** Parse b3dm buffer and extract THREE.Scene and batch table
     * @param {ArrayBuffer} buffer - the b3dm buffer.
     * @param {Object} options - additional properties.
     * @param {string=} [options.gltfUpAxis='Y'] - embedded glTF model up axis.
     * @param {string} options.urlBase - the base url of the b3dm file (used to fetch textures for the embedded glTF model).
     * @param {boolean=} [options.doNotPatchMaterial='false'] - disable patching material with logarithmic depth buffer support.
     * @param {float} [options.opacity=1.0] - the b3dm opacity.
     * @param {boolean=} [options.frustumCulled='false'] - enable frustum culling.
     * @param {boolean|Material=} [options.overrideMaterials='false'] - override b3dm's embedded glTF materials. If
     * true, a threejs [MeshBasicMaterial](https://threejs.org/docs/index.html?q=meshbasic#api/en/materials/MeshBasicMaterial)
     * is set up. config.overrideMaterials can also be a threejs [Material](https://threejs.org/docs/index.html?q=material#api/en/materials/Material)
     * in which case it will be the material used to override.
     * @return {Promise} - a promise that resolves with an object containig a THREE.Scene (gltf) and a batch table (batchTable).
     *
     */
    parse(buffer, options) {
        const gltfUpAxis = options.gltfUpAxis;
        options.frustumCulled = !!(options.frustumCulled);

        if (!buffer) {
            throw new Error('No array buffer provided.');
        }

        const view = new DataView(buffer, 4);   // starts after magic

        let byteOffset = 0;
        const b3dmHeader = {};

        // Magic type is unsigned char [4]
        const magicNumberByteLength = 4;
        b3dmHeader.magic = utf8Decoder.decode(new Uint8Array(buffer, 0, magicNumberByteLength));
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

            const headerByteLength = byteOffset + magicNumberByteLength;
            const promises = [];
            let FTJSON = {};
            const FT_RTC = new THREE.Vector3();
            if (b3dmHeader.FTJSONLength > 0) {
                const sizeBegin = headerByteLength;
                const jsonBuffer = buffer.slice(sizeBegin, b3dmHeader.FTJSONLength + sizeBegin);
                const content = utf8Decoder.decode(new Uint8Array(jsonBuffer));
                FTJSON = JSON.parse(content);
                if (FTJSON.RTC_CENTER) {
                    FT_RTC.fromArray(FTJSON.RTC_CENTER);
                } else {
                    FT_RTC.set(0, 0, 0);
                }
            }
            if (b3dmHeader.FTBinaryLength > 0) {
                console.warn('3D Tiles feature table binary not supported yet.');
            }

            // Parse batch table
            if (b3dmHeader.BTJSONLength > 0) {
                // sizeBegin is an index to the beginning of the batch table
                const sizeBegin = headerByteLength + b3dmHeader.FTJSONLength +
                    b3dmHeader.FTBinaryLength;
                const BTBuffer = buffer.slice(sizeBegin, sizeBegin + b3dmHeader.BTJSONLength +
                    b3dmHeader.BTBinaryLength);
                promises.push(Promise.resolve(new C3DTBatchTable(BTBuffer, b3dmHeader.BTJSONLength,
                    b3dmHeader.BTBinaryLength, FTJSON.BATCH_LENGTH, options.registeredExtensions)));
            } else {
                promises.push(Promise.resolve(new C3DTBatchTable()));
            }

            const posGltf = headerByteLength +
                b3dmHeader.FTJSONLength + b3dmHeader.FTBinaryLength +
                b3dmHeader.BTJSONLength + b3dmHeader.BTBinaryLength;

            const gltfBuffer = buffer.slice(posGltf);
            const headerView = new DataView(gltfBuffer, 0, 20);

            // Rotation managed
            if (gltfUpAxis === undefined || gltfUpAxis === 'Y') {
                options.gltfUpAxisMatrix = matrixChangeUpVectorZtoY;
            } else if (gltfUpAxis === 'X') {
                options.gltfUpAxisMatrix = matrixChangeUpVectorZtoX;
            }

            promises.push(GLTFParser.parse(gltfBuffer, options).then((gltf) => {
                // Apply relative center from Feature table.
                gltf.scene.position.copy(FT_RTC);

                // Apply relative center from gltf json.
                const contentArray = new Uint8Array(gltfBuffer, 20, headerView.getUint32(12, true));
                const content = utf8Decoder.decode(new Uint8Array(contentArray));
                const json = JSON.parse(content);
                if (json.extensions && json.extensions.CESIUM_RTC) {
                    gltf.scene.position.fromArray(json.extensions.CESIUM_RTC.center);
                    gltf.scene.updateMatrixWorld(true);
                }
                return gltf;
            }));
            return Promise.all(promises).then(values => ({ gltf: values[1], batchTable: values[0] }));
        } else {
            throw new Error('Invalid b3dm file.');
        }
    },
};
