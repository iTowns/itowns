import * as THREE from 'three';
import GLTFLoader from './GLTFLoader';
import LegacyGLTFLoader from './LegacyGLTFLoader';
import Capabilities from '../Core/System/Capabilities';
import shaderUtils from '../Renderer/Shader/ShaderUtils';
import $3dTilesHeaderParser from './3dTilesHeaderParser';
import utf8Decoder from '../utils/Utf8Decoder';

const matrixChangeUpVectorZtoY = (new THREE.Matrix4()).makeRotationX(Math.PI / 2);
// For gltf rotation
const matrixChangeUpVectorZtoX = (new THREE.Matrix4()).makeRotationZ(-Math.PI / 2);

const glTFLoader = new GLTFLoader();

const legacyGLTFLoader = new LegacyGLTFLoader();

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
            if (supported.indexOf(semantic) < 0) {
                delete obj.gltfShader.boundUniforms[name];
            }
        }
    }
}
// parse for RTC values
function applyOptionalCesiumRTC(data, gltf) {
    const headerView = new DataView(data, 0, 20);
    const contentArray = new Uint8Array(data, 20, headerView.getUint32(12, true));
    const content = utf8Decoder.decode(new Uint8Array(contentArray));
    const json = JSON.parse(content);
    if (json.extensions && json.extensions.CESIUM_RTC) {
        gltf.position.fromArray(json.extensions.CESIUM_RTC.center);
        gltf.updateMatrixWorld(true);
    }
}

export default {
    /** @module B3dmParser */
    /** Parse b3dm buffer and extract THREE.Scene and batch table
     * @function parse
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
        options = options || {};
        options.magic = 'b3dm';
        return $3dTilesHeaderParser.parse(buffer, options).then((data) => {
            const gltfBuffer = buffer.slice(data.byteOffset);
            const version = new DataView(gltfBuffer, 0, 20).getUint32(4, true);
            return new Promise((resolve/* , reject */) => {
                function onload(gltf) {
                    for (const scene of gltf.scenes) {
                        scene.traverse(filterUnsupportedSemantics);
                    }
                    // Rotation managed
                    if (options.gltfUpAxis === 'Y') {
                        gltf.scene.applyMatrix(matrixChangeUpVectorZtoY);
                    } else if (options.gltfUpAxis === 'X') {
                        gltf.scene.applyMatrix(matrixChangeUpVectorZtoX);
                    }

                    // RTC managed
                    applyOptionalCesiumRTC(gltfBuffer, gltf.scene);

                    const init_mesh = function f_init(mesh) {
                        mesh.frustumCulled = false;
                        if (mesh.material) {
                            if (options.overrideMaterials) {
                                mesh.material.dispose();
                                if (typeof (options.overrideMaterials) === 'object' &&
                                    options.overrideMaterials.isMaterial) {
                                    mesh.material = options.overrideMaterials.clone();
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

                    resolve({
                        object3d: gltf.scene,
                        batchTable: data.batchTable,
                    });
                }
                if (version === 1) {
                    legacyGLTFLoader.parse(gltfBuffer, onload, options.urlBase);
                } else {
                    glTFLoader.parse(gltfBuffer, options.urlBase, onload);
                }
            });
        });
    },
    format: '3d-tiles/b3dm',
    extensions: ['b3dm'],
    mimetypes: ['application/octet-stream'],
    fetchtype: 'arrayBuffer',
};
