import * as THREE from 'three';
import LegacyGLTFLoader from 'Parser/deprecated/LegacyGLTFLoader';
import { GLTFLoader } from 'ThreeExtended/loaders/GLTFLoader';

class iGLTFLoader extends THREE.Loader {
    /**
     * Parses [glTF](https://www.khronos.org/gltf/) 1.0 and 2.0 files.
     *
     * Under the hood, glTF 2.0 files are parsed with THREE.GLTFLoader and GLTF 1.0 are parsed with the previous THREE
     * GltfLoader (for 1.0 glTF) that has been kept and maintained in iTowns.
     *
     * Beware that gltf convention is y-up while itowns is z-up. You can apply a PI/2 rotation around the X axis to the
     * loaded model to transform from y-up to z-up. Note that you can also use Coordinates.geodesicNormal to get the normal
     * to a position on the globe (i.e. in GlobeView) to correctly orient a model on a GlobeView.
     *
     * @param {THREE.LoadingManager} [manager] - The loadingManager for the loader to use. Default is THREE.DefaultLoadingManager.
     */
    constructor(manager) {
        super(manager);
        this.legacyGLTFLoader = new LegacyGLTFLoader();
        this.glTFLoader = new GLTFLoader();
    }

    /**
     * Loads a gltf model from url and call the callback function with the parsed response content.
     * Adapted from threejs.
     * @param {String} url - the path/URL of the .gltf or .glb file.
     * @param {Function} onLoad - A function to be called after the loading is successfully completed. The function
     * receives the loaded JSON response returned from {@link parse}.
     * @param {Function} onProgress
     * @param {Function} onError
     */
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

    /**
     * Sets the draco loader instance for this gltf parser. Enable loading files with
     * [Draco](https://google.github.io/draco/) geometry extension. See Threejs
     * [DracoLoader](https://threejs.org/docs/index.html#examples/en/loaders/DRACOLoader) for more information.
     * Only works for GLTF 2.0 files.
     * @param {THREE.DracoLoader} dracoLoader - the threejs DracoLoader instance.
     */
    setDRACOLoader(dracoLoader) {
        this.glTFLoader.setDRACOLoader(dracoLoader);
    }

    /**
     * Sets the KTX2 loader instance for this gltf parser. Enable loading files with
     * [KTX2](https://www.khronos.org/ktx/) texture extension. See Threejs
     * [KTX2Loader](https://threejs.org/docs/index.html?q=KTX2#examples/en/loaders/KTX2Loader) for more information.
     * Only works for GLTF 2.0 files.
     * @param {THREE.KTX2Loader} ktx2Loader - the threejs KTX2Loader instance.
     */
    setKTX2Loader(ktx2Loader) {
        this.glTFLoader.setKTX2Loader(ktx2Loader);
    }

    /**
     * Sets the Mesh Optimizer decoder instance for this gltf parser. Enable loading files with
     * [MeshOptimizer](https://meshoptimizer.org/) geometry extension.
     * Only works for GLTF 2.0 files.
     * @param {Object} meshoptDecoder - the threejs meshopt decoder instance.
     */
    setMeshoptDecoder(meshoptDecoder) {
        this.glTFLoader.setMeshoptDecoder(meshoptDecoder);
    }

    /**
     * Registers a callback to load specific unknown or not standard GLTF extensions.
     * See Threejs [GltfLoader](https://threejs.org/docs/?q=gltflo#examples/en/loaders/GLTFLoader) for more
     * information.
     * @param {Function} callback - the callback function
     */
    register(callback) {
        this.glTFLoader.register(callback);
    }

    /**
     * Unregisters a load callback.
     * See Threejs [GltfLoader](https://threejs.org/docs/?q=gltflo#examples/en/loaders/GLTFLoader) for more
     * information.
     * @param {Function} callback - the callback function
     */
    unregister(callback) {
        this.glTFLoader.unregister(callback);
    }

    /** Parse a glTF-based ArrayBuffer, JSON string or object and fire onLoad callback when complete.
     * Calls Threejs [GLTFLoader.parse](https://threejs.org/docs/?q=gltflo#examples/en/loaders/GLTFLoader.parse) for
     * glTF 2.0 files and LegacyGLTFLoader.parse for gtTF 1.0 files.
     * @param {ArrayBuffer|String|Object} buffer - the glTF asset to parse, as an ArrayBuffer, JSON string or object.
     * @param {String} path - the base path from which to find subsequent glTF resources such as textures and .bin data files.
     * @param {Function} onLoad — A function to be called when parse completes. The argument to the onLoad function will
     * be an Object that contains loaded parts: .scene, .scenes, .cameras, .animations, and .asset.
     * @param {Function} [onError] — A function to be called if an error occurs during parsing. The function receives error as an argument.
     */
    parse(buffer, path, onLoad, onError) {
        if (!buffer || !path) {
            onError('[iGLTFLoader]: Buffer and path are mandatory to parse a glTF.');
            return;
        }

        const headerView = new DataView(buffer, 0, 20);
        const version = headerView.getUint32(4, true);

        if (version === 1) {
            this.legacyGLTFLoader.parse(buffer, path, onLoad, onError);
        } else {
            this.glTFLoader.parse(buffer, path, onLoad, onError);
        }
    }

    /**
     * Async promise-based parsing of a glTF-based ArrayBuffer, JSON string or object.
     * @param {ArrayBuffer|String|Object} data - the glTF asset to parse, as an ArrayBuffer, JSON string or object.
     * @param {String} path - the base path from which to find subsequent glTF resources such as textures and .bin data files.
     * @returns {Promise<Object>} A promise that resolves an Object that contains loaded parts:
     * .scene, .scenes, .cameras, .animations, and .asset, when parsing is done.
     */
    parseAsync(data, path) {
        const scope = this;

        return new Promise((resolve, reject) => {
            scope.parse(data, path, resolve, reject);
        });
    }
}

export default iGLTFLoader;
