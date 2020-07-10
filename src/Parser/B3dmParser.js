import * as THREE from 'three';
import Capabilities from 'Core/System/Capabilities';
import { GLTFLoader } from 'ThreeExtended/loaders/GLTFLoader';
import { DRACOLoader } from 'ThreeExtended/loaders/DRACOLoader';
import LegacyGLTFLoader from 'Parser/deprecated/LegacyGLTFLoader';
import shaderUtils from 'Renderer/Shader/ShaderUtils';
import utf8Decoder from 'Utils/Utf8Decoder';
import C3DTBatchTable from 'Core/3DTiles/C3DTBatchTable';

const matrixChangeUpVectorZtoY = (new THREE.Matrix4()).makeRotationX(Math.PI / 2);
// For gltf rotation
const matrixChangeUpVectorZtoX = (new THREE.Matrix4()).makeRotationZ(-Math.PI / 2);

export const glTFLoader = new GLTFLoader();

export const legacyGLTFLoader = new LegacyGLTFLoader();

function filterUnsupportedSemantics(obj) {
    // see GLTFLoader GLTFShader.prototype.update function
    const supported = [
        'MODELVIEW',
        'MODELVIEWINVERSETRANSPOSE',
        'PROJECTION',
        'JOINTMATRIX'];

    if (obj.gltfShader) {
        const names = [];
        // eslint-disable-next-line guard-for-in
        for (const name in obj.gltfShader.boundUniforms) {
            names.push(name);
        }
        for (const name of names) {
            const semantic = obj.gltfShader.boundUniforms[name].semantic;
            if (!supported.includes(semantic)) {
                delete obj.gltfShader.boundUniforms[name];
            }
        }
    }
}

/**
 * @module B3dmParser
 */
/**
 * Enable Draco decoding for gltf.
 * @param {string} path to draco library folder.
 * This library is mandatory to load b3dm with Draco compression.
 * @param {object} config optional configuration for Draco compression.
 *
 * The Draco library files are in folder itowns/examples/libs/draco/.
 * You are obliged to indicate this path when you want enable the Draco Decoding.
 *
 * For more information on Draco, read file in /itowns/examples/libs/draco/README.md.
 *
 * @example <caption>Enable draco decoder</caption>
 * // if you copied the folder from /itowns/examples/libs/draco/ to your root project,
 * // You could set path with './'.
 * itowns.enableDracoLoader('./');
 */
export function enableDracoLoader(path, config) {
    if (!path) {
        throw new Error('Path to draco folder is mandatory');
    }
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(path);
    if (config) {
        dracoLoader.setDecoderConfig(config);
    }
    glTFLoader.setDRACOLoader(dracoLoader);
}

export default {
    /** Parse b3dm buffer and extract THREE.Scene and batch table
     * @param {ArrayBuffer} buffer - the b3dm buffer.
     * @param {Object} options - additional properties.
     * @param {string=} [options.gltfUpAxis='Y'] - embedded glTF model up axis.
     * @param {string} options.urlBase - the base url of the b3dm file (used to fetch textures for the embedded glTF model).
     * @param {boolean=} [options.doNotPatchMaterial='false'] - disable patching material with logarithmic depth buffer support.
     * @param {float} [options.opacity=1.0] - the b3dm opacity.
     * @param {boolean|Material=} [options.overrideMaterials='false'] - override b3dm's embedded glTF materials. If overrideMaterials is a three.js material, it will be the material used to override.
     * @return {Promise} - a promise that resolves with an object containig a THREE.Scene (gltf) and a batch table (batchTable).
     *
     */
    parse(buffer, options) {
        const gltfUpAxis = options.gltfUpAxis;
        const urlBase = options.urlBase;
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
                const BTBuffer = buffer.slice(sizeBegin, b3dmHeader.BTJSONLength + sizeBegin);
                promises.push(new C3DTBatchTable(BTBuffer,
                    b3dmHeader.BTBinaryLength, FTJSON.BATCH_LENGTH, options.registeredExtensions));
            } else {
                promises.push(Promise.resolve({}));
            }

            const posGltf = headerByteLength +
                b3dmHeader.FTJSONLength + b3dmHeader.FTBinaryLength +
                b3dmHeader.BTJSONLength + b3dmHeader.BTBinaryLength;

            const gltfBuffer = buffer.slice(posGltf);
            const headerView = new DataView(gltfBuffer, 0, 20);

            promises.push(new Promise((resolve/* , reject */) => {
                const onload = (gltf) => {
                    for (const scene of gltf.scenes) {
                        scene.traverse(filterUnsupportedSemantics);
                    }
                    // Rotation managed
                    if (gltfUpAxis === undefined || gltfUpAxis === 'Y') {
                        gltf.scene.applyMatrix4(matrixChangeUpVectorZtoY);
                    } else if (gltfUpAxis === 'X') {
                        gltf.scene.applyMatrix4(matrixChangeUpVectorZtoX);
                    }

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

                    const init_mesh = function f_init(mesh) {
                        mesh.frustumCulled = false;
                        if (mesh.material) {
                            if (options.overrideMaterials) {
                                if (Array.isArray(mesh.material)) {
                                    for (const material of mesh.material) {
                                        material.dispose();
                                    }
                                } else {
                                    mesh.material.dispose();
                                }
                                if (typeof (options.overrideMaterials) === 'object' &&
                                    options.overrideMaterials.isMaterial) {
                                    mesh.material = options.overrideMaterials;
                                } else {
                                    mesh.material = new THREE.MeshLambertMaterial({ color: 0xffffff });
                                }
                            } else if (Capabilities.isLogDepthBufferSupported()
                                        && mesh.material.isRawShaderMaterial
                                        && !options.doNotPatchMaterial) {
                                shaderUtils.patchMaterialForLogDepthSupport(mesh.material);
                                console.warn('b3dm shader has been patched to add log depth buffer support');
                            }
                            mesh.material.transparent = options.opacity < 1.0;
                            mesh.material.opacity = options.opacity;
                        }
                    };
                    gltf.scene.traverse(init_mesh);

                    resolve(gltf);
                };

                const version = headerView.getUint32(4, true);

                if (version === 1) {
                    legacyGLTFLoader.parse(gltfBuffer, urlBase, onload);
                } else {
                    glTFLoader.parse(gltfBuffer, urlBase, onload);
                }
            }));
            return Promise.all(promises).then(values => ({ gltf: values[1], batchTable: values[0] }));
        } else {
            throw new Error('Invalid b3dm file.');
        }
    },
};
