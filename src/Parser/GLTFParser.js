import * as THREE from 'three';
import Capabilities from 'Core/System/Capabilities';
import { GLTFLoader } from 'ThreeExtended/loaders/GLTFLoader';
import { DRACOLoader } from 'ThreeExtended/loaders/DRACOLoader';
import LegacyGLTFLoader from 'Parser/deprecated/LegacyGLTFLoader';
import shaderUtils from 'Renderer/Shader/ShaderUtils';
import utf8Decoder from 'Utils/Utf8Decoder';
import ReferLayerProperties from 'Layer/ReferencingLayerProperties';
import { MeshBasicMaterial } from 'three';
import disposeThreeMaterial from 'Utils/ThreeUtils';

const matrixChangeUpVectorZtoY = (new THREE.Matrix4()).makeRotationX(Math.PI / 2);

export const glTFLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('./libs/draco/');


glTFLoader.setDRACOLoader(dracoLoader);

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
    /** Parse gltf buffer and extract THREE.Scene and batch table
     * @param {ArrayBuffer} buffer - the gltf buffer.
     * @param {Object} options - additional properties.
     * @param {Matrix4=} [options.gltfUpAxisMatrix={}] - Matrix4f up axis transformation, by default Z->Y is applied
     * @param {string} options.urlBase - the base url of the glTF file (used to fetch textures for the embedded glTF model).
     * @param {boolean=} [options.doNotPatchMaterial='false'] - disable patching material with logarithmic depth buffer support.
     * @param {float} [options.opacity=1.0] - the b3dm opacity. // unused here for now
     * @param {boolean|Material=} [options.overrideMaterials='false'] - override b3dm's embedded glTF materials. If
     * true, a threejs [MeshBasicMaterial](https://threejs.org/docs/index.html?q=meshbasic#api/en/materials/MeshBasicMaterial)
     * is set up. config.overrideMaterials can also be a threejs [Material](https://threejs.org/docs/index.html?q=material#api/en/materials/Material)
     * in which case it will be the material used to override.
     * @return {Promise} - a promise that resolves with an object containig a THREE.Scene (gltf) and a batch table (batchTable).
     *
     */
    parse(buffer, options) {
        const gltfUpAxisMatrix = options.gltfUpAxisMatrix;
        const urlBase = options.urlBase;
        if (!buffer) {
            throw new Error('No array buffer provided.');
        }

        const gltfHeader = {};

        // Magic type is unsigned char [4]
        const magicNumberByteLength = 4;
        gltfHeader.magic = utf8Decoder.decode(new Uint8Array(buffer, 0, magicNumberByteLength));
        if (gltfHeader.magic) {
            const promises = [];
            promises.push(new Promise((resolve/* , reject */) => {
                const onload = (gltf) => {
                    for (const scene of gltf.scenes) {
                        scene.traverse(filterUnsupportedSemantics);
                    }
                    // for gltf Z->Y is applied
                    if (!gltfUpAxisMatrix) {
                        gltf.scene.applyMatrix4(matrixChangeUpVectorZtoY);
                    } else {
                        gltf.scene.applyMatrix4(gltfUpAxisMatrix);
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
                                console.warn('glTF shader has been patched to add log depth buffer support');
                            }
                            ReferLayerProperties(mesh.material, options.layer);
                        }
                    };
                    gltf.scene.traverse(init_mesh);

                    resolve(gltf);
                };
                const headerView = new DataView(buffer, 0, 20);
                const version = headerView.getUint32(4, true);

                if (version === 1) {
                    legacyGLTFLoader.parse(buffer, urlBase, onload);
                } else {
                    glTFLoader.parse(buffer, urlBase, onload);
                }
            }));
            return Promise.all(promises).then(values => (values[0]));
        } else {
            throw new Error('Invalid gLTF file.');
        }
    },
};
