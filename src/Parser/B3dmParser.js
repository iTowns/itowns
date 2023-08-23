import * as THREE from 'three';
import Capabilities from 'Core/System/Capabilities';
import { GLTFLoader } from 'ThreeExtended/loaders/GLTFLoader';
import { DRACOLoader } from 'ThreeExtended/loaders/DRACOLoader';
import { KTX2Loader } from 'ThreeExtended/loaders/KTX2Loader';
import LegacyGLTFLoader from 'Parser/deprecated/LegacyGLTFLoader';
import shaderUtils from 'Renderer/Shader/ShaderUtils';
import utf8Decoder from 'Utils/Utf8Decoder';
import C3DTBatchTable from 'Core/3DTiles/C3DTBatchTable';
import ReferLayerProperties from 'Layer/ReferencingLayerProperties';
import { MeshBasicMaterial } from 'three';
import disposeThreeMaterial from 'Utils/ThreeUtils';

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
 *
 * The Draco library files are in folder itowns/examples/libs/draco/.
 * You must indicate this path when you want to enable Draco Decoding.
 * For more information on Draco, read /itowns/examples/libs/draco/README.md.
 *
 * @example <caption>Enable draco decoder</caption>
 * // if you copied /itowns/examples/libs/draco/ to the root folder of your project,you can set the path to './'.
 * itowns.enableDracoLoader('./');
 *
 *  @param {string} path path to draco library folder.
 * This library is mandatory to load b3dm and gltf with Draco compression.
 * @param {object} config optional configuration for Draco compression.
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

/**
 * Enable KTX2 decoding for gltf. This library is mandatory to load b3dm and gltf with KTX2 compression.
 *
 * The KTX2 library files are in folder itowns/examples/libs/basis/.
 * You must indicate this path when you want to enable KTX2 decoding.
 * For more information about KTX2, read /itowns/examples/libs/basis/README.md.
 *
 * @example <caption>Enable ktx2 decoder</caption>
 * // if you copied /itowns/examples/libs/draco/ to the root folder of your project,you can set the path to './'.
 * itowns.enableKtx2Loader('./', view.mainLoop.gfxEngine.renderer);
 *
 * @param {string} path path to KTX2 library folder.
 * @param {THREE.WebGLRenderer} renderer the threejs renderer
 */
export function enableKtx2Loader(path, renderer) {
    if (!path || !renderer) {
        throw new Error('Path to ktx2 folder and renderer are mandatory');
    }
    const ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath(path);
    ktx2Loader.detectSupport(renderer);
    glTFLoader.setKTX2Loader(ktx2Loader);
}

export default {
    /** Parse b3dm buffer and extract THREE.Scene and batch table
     * @param {ArrayBuffer} buffer - the b3dm buffer.
     * @param {Object} options - additional properties.
     * @param {string=} [options.gltfUpAxis='Y'] - embedded glTF model up axis.
     * @param {string} options.urlBase - the base url of the b3dm file (used to fetch textures for the embedded glTF model).
     * @param {boolean=} [options.doNotPatchMaterial='false'] - disable patching material with logarithmic depth buffer support.
     * @param {float} [options.opacity=1.0] - the b3dm opacity.
     * @param {boolean|Material=} [options.overrideMaterials='false'] - override b3dm's embedded glTF materials. If
     * true, a threejs [MeshBasicMaterial](https://threejs.org/docs/index.html?q=meshbasic#api/en/materials/MeshBasicMaterial)
     * is set up. config.overrideMaterials can also be a threejs [Material](https://threejs.org/docs/index.html?q=material#api/en/materials/Material)
     * in which case it will be the material used to override.
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
                                const oldMat = mesh.material;
                                // Set up new material
                                if (typeof (options.overrideMaterials) === 'object' &&
                                options.overrideMaterials.isMaterial) {
                                    mesh.material = options.overrideMaterials;
                                } else {
                                    mesh.material = new MeshBasicMaterial();
                                }
                                disposeThreeMaterial(oldMat);
                            } else if (Capabilities.isLogDepthBufferSupported()
                                        && mesh.material.isRawShaderMaterial
                                        && !options.doNotPatchMaterial) {
                                shaderUtils.patchMaterialForLogDepthSupport(mesh.material);
                                console.warn('b3dm shader has been patched to add log depth buffer support');
                            }
                            ReferLayerProperties(mesh.material, options.layer);
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
