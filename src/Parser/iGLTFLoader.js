import * as THREE from 'three';
import LegacyGLTFLoader from 'Parser/deprecated/LegacyGLTFLoader'; // TODO Consider moving it out from deprecated folder
import { GLTFLoader } from 'ThreeExtended/loaders/GLTFLoader';

// const matrixChangeUpVectorYtoZ = (new THREE.Matrix4()).makeRotationX(Math.PI / 2); // TODO

// TODO document me and my methods
// TODO: should we leave this file in parsers/?
/**
 * @class iGLTFLoader
 * @description Parses [glTF](https://www.khronos.org/gltf/) 1.0 and 2.0 files.
 *
 * Under the hood, glTF 2.0 files are parsed with THREE.GltfLoader() and GLTF 1.0 are parsed with the previous THREE
 * GltfLoader (for 1.0 glTF) that has been kept and maintained in iTowns.
 */
class iGLTFLoader extends THREE.Loader {
    constructor(manager) {
        super(manager);
        this.legacyGLTFLoader = new LegacyGLTFLoader();
        this.glTFLoader = new GLTFLoader();
    }

    // adapted from three
    load(url, onLoad, onProgress, onError) {
        const scope = this;

        let resourcePath;

        if (this.resourcePath !== '') {
            resourcePath = this.resourcePath;
        } else if (this.path !== '') {
            // If a base path is set, resources will be relative paths from that plus the relative path of the gltf file
            // Example  path = 'https://my-cnd-server.com/', url = 'assets/models/model.gltf'
            // resourcePath = 'https://my-cnd-server.com/assets/models/'
            // referenced resource 'model.bin' will be loaded from 'https://my-cnd-server.com/assets/models/model.bin'
            // referenced resource '../textures/texture.png' will be loaded from 'https://my-cnd-server.com/assets/textures/texture.png'
            const relativeUrl = THREE.LoaderUtils.extractUrlBase(url);
            resourcePath = THREE.LoaderUtils.resolveURL(relativeUrl, this.path);
        } else {
            resourcePath = THREE.LoaderUtils.extractUrlBase(url);
        }

        // Tells the LoadingManager to track an extra item, which resolves after
        // the model is fully loaded. This means the count of items loaded will
        // be incorrect, but ensures manager.onLoad() does not fire early.
        this.manager.itemStart(url);

        const _onError = (e) => {
            if (onError) {
                onError(e);
            } else {
                console.error(e);
            }

            scope.manager.itemError(url);
            scope.manager.itemEnd(url);
        };

        const loader = new THREE.FileLoader(this.manager);

        loader.setPath(this.path);
        loader.setResponseType('arraybuffer');
        loader.setRequestHeader(this.requestHeader);
        loader.setWithCredentials(this.withCredentials);

        loader.load(url, (data) => {
            try {
                scope.parse(data, resourcePath, (gltf) => {
                    onLoad(gltf);

                    scope.manager.itemEnd(url);
                }, _onError);
            } catch (e) {
                _onError(e);
            }
        }, onProgress, _onError);
    }

    setDRACOLoader(dracoLoader) {
        this.glTFLoader.setDRACOLoader(dracoLoader);
    }

    setKTX2Loader(ktx2Loader) {
        this.glTFLoader.setKTX2Loader(ktx2Loader);
    }

    setMeshoptDecoder(meshoptDecoder) {
        this.glTFLoader.setMeshoptDecoder(meshoptDecoder);
    }

    register(callback) {
        this.glTFLoader.register(callback);
    }

    unregister(callback) {
        this.glTFLoader.unregister(callback);
    }

    /** Parses a gltf buffer to an object with threejs structures and applies a y-up to z-up conversion to align with
     * itowns convention. Essentially calls THREE.GltfLoader.parse() for glTF 2.0 files and the legacy threejs parser
     * for gtTF 1.0 files.
     * @param {ArrayBuffer} buffer - the glTF asset to parse, as an ArrayBuffer, JSON string or object.
     * @param {String} path - the base path from which to find subsequent glTF resources such as textures and .bin data files.
     * @param {Function} onLoad — A function to be called when parse completes.
     * @param {Function} [onError] — A function to be called if an error occurs during parsing. The function receives error as an argument.
     */
    parse(buffer, path, onLoad, onError) {
        if (!buffer || !path) {
            console.error('[iGLTFLoader]: Buffer and path are mandatory to parse a glTF.');
        }

        const headerView = new DataView(buffer, 0, 20);
        const version = headerView.getUint32(4, true);

        // TODO we may need to not apply it for 3d-tiles-renderer-js (or make it optional) + change B3DMPArser accordingly
        // and make it use parseAsync
        // Apply y-up (gltf convention) to z-up (itowns convention) conversion
        // const onload = (gltf) => {
        //     gltf.scene.applyMatrix4(matrixChangeUpVectorYtoZ);
        //     resolve(gltf);
        // };
        // const onError = (e) => {
        //     reject(new Error(`[GLTFParser]: Failed to parse gltf with error: ${e}`));
        // };

        if (version === 1) {
            this.legacyGLTFLoader.parse(buffer, path, onLoad, onError);
        } else {
            this.glTFLoader.parse(buffer, path, onLoad, onError);
        }
    }

    parseAsync(data, path) {
        const scope = this;

        return new Promise((resolve, reject) => {
            scope.parse(data, path, resolve, reject);
        });
    }
}

export default iGLTFLoader;
