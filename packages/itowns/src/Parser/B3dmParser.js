import * as THREE from 'three';
import C3DTBatchTable from 'Core/3DTiles/C3DTBatchTable';
import Capabilities from 'Core/System/Capabilities';
import { MeshBasicMaterial } from 'three';
import disposeThreeMaterial from 'Utils/ThreeUtils';
import shaderUtils from 'Renderer/Shader/ShaderUtils';
import ReferLayerProperties from 'Layer/ReferencingLayerProperties';
import GLTFParser from './GLTFParser';

const matrixChangeUpVectorYtoZInv = (new THREE.Matrix4()).makeRotationX(-Math.PI / 2);
const matrixChangeUpVectorXtoZ = (new THREE.Matrix4()).makeRotationZ(-Math.PI / 2);

const utf8Decoder = new TextDecoder();

/**
 * 3D Tiles pre-1.0 contain not standardized and specific uniforms that we filter out to avoid shader compilation errors
 * This method is passed to scene.traverse and applied to all 3D objects of the loaded gltf.
 * @param {THREE.Object3D} obj - 3D object of the gltf hierarchy
 */
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
 * 3D Tiles pre-1.0 had a gltfUpAxis parameter that defined the up vector of the gltf file that might be different from
 * the standard y-up for gltf. Manage the case when this gltfUpAxis is defined (i.e. apply the correct rotation to the
 * gltf file to have it z-up in the end).
 * @param {THREE.Object3D} gltfScene - the parsed glTF scene
 * @param {String} gltfUpAxis - the gltfUpAxis parameter
 */
function applyDeprecatedGltfUpAxis(gltfScene, gltfUpAxis) {
    if (gltfUpAxis === 'Z') {
        // If gltf up was already z-up, apply the inverse transform matrix that was applied in the glTFParser
        gltfScene.applyMatrix4(matrixChangeUpVectorYtoZInv);
    } else if (gltfUpAxis === 'X') {
        gltfScene.applyMatrix4(matrixChangeUpVectorYtoZInv);
        gltfScene.applyMatrix4(matrixChangeUpVectorXtoZ);
    }
}

/**
 * @module B3dmParser
 */

export default {
    /** Parse b3dm buffer and extract THREE.Scene and batch table
     * @param {ArrayBuffer} buffer - the b3dm buffer.
     * @param {Object} options - additional properties.
     * @param {string=} [options.gltfUpAxis='Y'] - embedded glTF model up axis.
     * @param {string} options.urlBase - the base url of the b3dm file (used to fetch textures for the embedded glTF model).
     * @param {boolean=} [options.doNotPatchMaterial=false] - disable patching material with logarithmic depth buffer support.
     * @param {float} [options.opacity=1.0] - the b3dm opacity.
     * @param {boolean=} [options.frustumCulled=false] - enable frustum culling.
     * @param {boolean|Material=} [options.overrideMaterials=false] - override b3dm's embedded glTF materials. If
     * true, a threejs [MeshBasicMaterial](https://threejs.org/docs/index.html?q=meshbasic#api/en/materials/MeshBasicMaterial)
     * is set up. config.overrideMaterials can also be a threejs [Material](https://threejs.org/docs/index.html?q=material#api/en/materials/Material)
     * in which case it will be the material used to override.
     * @return {Promise} - a promise that resolves with an object containig a THREE.Scene (gltf) and a batch table (batchTable).
     *
     */
    parse(buffer, options) {
        const frustumCulled = options.frustumCulled === true;

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

            promises.push(GLTFParser.parse(gltfBuffer, options).then((gltf) => {
                for (const scene of gltf.scenes) {
                    scene.traverse(filterUnsupportedSemantics);
                }

                applyDeprecatedGltfUpAxis(gltf.scene, options.gltfUpAxis);

                const shouldBePatchedForLogDepthSupport = Capabilities.isLogDepthBufferSupported() && !options.doNotPatchMaterial;
                if (options.frustumCulling === false || options.overrideMaterials || shouldBePatchedForLogDepthSupport || options.layer) {
                    gltf.scene.traverse(init_mesh);
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

                return gltf;
            }).catch((e) => { throw new Error(e); }));
            return Promise.all(promises).then(values => ({ gltf: values[1], batchTable: values[0] })).catch((e) => { throw new Error(e); });
        } else {
            throw new Error('Invalid b3dm file.');
        }
    },
};
