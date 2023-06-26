import * as THREE from 'three';
import { GLTFLoader } from 'ThreeExtended/loaders/GLTFLoader';
import { DRACOLoader } from 'ThreeExtended/loaders/DRACOLoader';
import { KTX2Loader } from 'ThreeExtended/loaders/KTX2Loader';
import LegacyGLTFLoader from 'Parser/deprecated/LegacyGLTFLoader';

const matrixChangeUpVectorYtoZ = (new THREE.Matrix4()).makeRotationX(Math.PI / 2);

export const glTFLoader = new GLTFLoader();
export const legacyGLTFLoader = new LegacyGLTFLoader();

/**
 * @module GLTFParser
 * @description Parses [glTF](https://www.khronos.org/gltf/) 1.0 and 2.0 files.
 *
 * Under the hood, glTF 2.0 files are parsed with THREE.GltfLoader() and GLTF 1.0 are parsed with the previous THREE
 * GltfLoader (for 1.0 glTF) that has been kept and maintained in iTowns.
 */

/**
 * Enable loading gltf files with [Draco](https://google.github.io/draco/) geometry extension.
 *
 * @param {String} path path to draco library folder containing the JS and WASM decoder libraries. They can be found in
 * [itowns examples](https://github.com/iTowns/itowns/tree/master/examples/libs/draco).
 * @param {Object} [config] optional configuration for Draco decoder (see threejs'
 * [setDecoderConfig](https://threejs.org/docs/index.html?q=draco#examples/en/loaders/DRACOLoader.setDecoderConfig) that
 * is called under the hood with this configuration for details.
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
 * Enable loading gltf files with [KTX2](https://www.khronos.org/ktx/) texture extension.
 *
 * @param {String} path path to ktx2 library folder containing the JS and WASM decoder libraries. They can be found in
 * [itowns examples](https://github.com/iTowns/itowns/tree/master/examples/libs/basis).
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
    /** Parses a gltf buffer to an object with threejs structures and applies a y-up to z-up conversion to align with
     * itowns convention. Essentially calls THREE.GltfLoader.parse() for glTF 2.0 files and the legacy threejs parser
     * for gtTF 1.0 files.
     * @param {ArrayBuffer} buffer - the glTF asset to parse, as an ArrayBuffer, JSON string or object.
     * @param {String} path - the base path from which to find subsequent glTF resources such as textures and .bin data files.
     * @return {Promise} - a promise that resolves with an object containing an Object that contains loaded parts:
     * .scene, .scenes, .cameras, .animations, and .asset.
     */
    parse(buffer, path) {
        return new Promise((resolve, reject) => {
            if (!buffer || !path) {
                reject(new Error('[GLTFParser]: Buffer and path are mandatory to parse a glTF.'));
                return;
            }

            // Apply y-up (gltf convention) to z-up (itowns convention) conversion
            const onload = (gltf) => {
                gltf.scene.applyMatrix4(matrixChangeUpVectorYtoZ);
                resolve(gltf);
            };
            const onError = (e) => {
                reject(new Error(`[GLTFParser]: Failed to parse gltf with error: ${e}`));
            };
            const headerView = new DataView(buffer, 0, 20);
            const version = headerView.getUint32(4, true);

            if (version === 1) {
                legacyGLTFLoader.parse(buffer, path, onload, onError);
            } else {
                glTFLoader.parse(buffer, path, onload, onError);
            }
        });
    },
};
