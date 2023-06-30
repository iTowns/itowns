import * as THREE from 'three';
import Capabilities from 'Core/System/Capabilities';
import { GLTFLoader } from 'ThreeExtended/loaders/GLTFLoader';
import { DRACOLoader } from 'ThreeExtended/loaders/DRACOLoader';
import { KTX2Loader } from 'ThreeExtended/loaders/KTX2Loader';
import LegacyGLTFLoader from 'Parser/deprecated/LegacyGLTFLoader';
import shaderUtils from 'Renderer/Shader/ShaderUtils';
import utf8Decoder from 'Utils/Utf8Decoder';
import ReferLayerProperties from 'Layer/ReferencingLayerProperties';
import { MeshBasicMaterial } from 'three';
import disposeThreeMaterial from 'Utils/ThreeUtils';

const matrixChangeUpVectorYtoZ = (new THREE.Matrix4()).makeRotationX(Math.PI / 2);

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
 * @module GLTFParser
 * Supports GLTF 1.0 and 2.0 loading.
 * GLTF 2.0 loading is done with THREE.GltfLoader().
 * Filters out non standard cesium-specific semantic that may have been added to gltf embedded in 3D Tiles.
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
    /** Parse gltf buffer and extract THREE.Scene
     * @param {ArrayBuffer} buffer - the gltf buffer.
     * @param {Object} options - additional properties.
     * @param {Matrix4=} [options.gltfUpAxisMatrix={}] - Matrix4f up axis transformation, by default Y->Z is applied
     * @param {string} options.urlBase - the base url of the glTF file (used to fetch textures for the embedded glTF model).
     * @param {boolean=} [options.doNotPatchMaterial='false'] - disable patching material with logarithmic depth buffer support.
     * @param {boolean=} [options.frustumCulled='true'] - enable frustum culling.
     * @param {boolean|Material=} [options.overrideMaterials='false'] - override b3dm's embedded glTF materials. If
     * true, a threejs [MeshBasicMaterial](https://threejs.org/docs/index.html?q=meshbasic#api/en/materials/MeshBasicMaterial)
     * is set up. config.overrideMaterials can also be a threejs [Material](https://threejs.org/docs/index.html?q=material#api/en/materials/Material)
     * in which case it will be the material used to override.
     * @return {Promise} - a promise that resolves with an object containig a THREE.Scene (gltf)
     *
     */
    parse(buffer, options) {
        const gltfUpAxisMatrix = options.gltfUpAxisMatrix;
        const urlBase = options.urlBase;
        const frustumCulled = options.frustumCulled === undefined || options.frustumCulled === null ? true : !!(options.frustumCulled);

        const init_mesh = function f_init(mesh) {
            mesh.frustumCulled = frustumCulled;
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
                    console.warn('glTF shader has been patched to add log depth buffer support');
                }
                ReferLayerProperties(mesh.material, options.layer);
            }
        };

        if (!buffer) {
            throw new Error('No array buffer provided.');
        }

        const gltfHeader = {};

        // Magic type is unsigned char [4]
        const magicNumberByteLength = 4;
        gltfHeader.magic = utf8Decoder.decode(new Uint8Array(buffer, 0, magicNumberByteLength));
        if (gltfHeader.magic) {
            const promiseGltf = new Promise((resolve/* , reject */) => {
                const onload = (gltf) => {
                    for (const scene of gltf.scenes) {
                        scene.traverse(filterUnsupportedSemantics);
                    }
                    // for gltf Y->Z is applied
                    if (!gltfUpAxisMatrix) {
                        gltf.scene.applyMatrix4(matrixChangeUpVectorYtoZ);
                    } else {
                        gltf.scene.applyMatrix4(gltfUpAxisMatrix);
                    }

                    const shouldBePatchedForLogDepthSupport = Capabilities.isLogDepthBufferSupported() && !options.doNotPatchMaterial;
                    if (options.frustumCulling === false || options.overrideMaterials || shouldBePatchedForLogDepthSupport || options.layer) {
                        gltf.scene.traverse(init_mesh);
                    }

                    resolve(gltf);
                };
                const headerView = new DataView(buffer, 0, 20);
                const version = headerView.getUint32(4, true);

                if (version === 1) {
                    legacyGLTFLoader.parse(buffer, urlBase, onload);
                } else {
                    glTFLoader.parse(buffer, urlBase, onload);
                }
            });
            return promiseGltf;
        } else {
            throw new Error('Invalid gLTF file.');
        }
    },
};
