import * as THREE from 'three';
import { CesiumIonTilesRenderer, GoogleTilesRenderer, LRUCache, PriorityQueue, TilesRenderer, DebugTilesRenderer } from '3d-tiles-renderer';
import GeometryLayer from 'Layer/GeometryLayer';
import iGLTFLoader from 'Parser/iGLTFLoader';
import { DRACOLoader } from 'ThreeExtended/loaders/DRACOLoader';
import { KTX2Loader } from 'ThreeExtended/loaders/KTX2Loader';

// Internal instance of GLTFLoader, passed to 3d-tiles-renderer-js to support GLTF 1.0 and 2.0
const itownsGLTFLoader = new iGLTFLoader();

/**
 * Enable loading 3D Tiles with [Draco](https://google.github.io/draco/) geometry extension.
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
    itownsGLTFLoader.setDRACOLoader(dracoLoader);
}

/**
 * Enable loading 3D Tiles with [KTX2](https://www.khronos.org/ktx/) texture extension.
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
    itownsGLTFLoader.setKTX2Loader(ktx2Loader);
}

// TODO: find a way to configure max LRUCache and PriorityQueue
// TODO: syntax not possible with current API -> open a PR on its side
// const lruCache = new LRUCache();
// const downloadQueue = new PriorityQueue();
// const parseQueue = new PriorityQueue();

class ThreeDTilesLayer extends GeometryLayer {
    constructor(id, config) {
        super(id, new THREE.Group(), { source: config.source });
        this.isThreeDTilesLayer = true;

        if (config.source.isC3DTilesIonSource) {
            this.tilesRenderer = new CesiumIonTilesRenderer(config.source.assetId, config.source.accessToken);
        } else if (config.source.isC3DTilesGoogleSource) {
            this.tilesRenderer = new GoogleTilesRenderer(config.source.key);
        } else {
            this.tilesRenderer = new TilesRenderer(this.source.url);
        }

        this.tilesRenderer.manager.addHandler(/\.gltf$/, itownsGLTFLoader);

        // Set cache, download and parse queues to be shared amongst 3D tiles layers
        // this.tilesRenderer.lruCache = lruCache;
        // this.tilesRenderer.downloadQueue = downloadQueue;
        // this.tilesRenderer.parseQueue = parseQueue;

        this.object3d.add(this.tilesRenderer.group);
    }

    // TODO: what happens if the layer is added to multiple views? Should we store multiple tilesRenderer?
    // How does it work for other layer types?
    __setup(view) {
        this.tilesRenderer.setCamera(view.camera3D);
        this.tilesRenderer.setResolutionFromRenderer(view.camera3D, view.renderer);
        // TODO: should we store the tileset and our own list of models? or at least provide an API to access them
        this.tilesRenderer.onLoadTileSet = () => {
            view.notifyChange(this);
        };
        this.tilesRenderer.onLoadModel = () => {
            view.notifyChange(this);
        };
    }

    preUpdate() {
        this.tilesRenderer.update();
        // const str = `Downloading: ${this.tilesRenderer.stats.downloading} Parsing: ${this.tilesRenderer.stats.parsing} Visible: ${this.tilesRenderer.visibleTiles.size}`;
        // console.log(str);
        return null; // don't return any element because 3d-tiles-renderer updates them
    }

    update() {
        // empty, elements are updated by 3d-tiles-renderer
    }

    delete() {
        this.tilesRenderer.dispose();
    }

    // TODO Methods: attach; detach; getObjectToUpdateForAttachedLayers; getC3DTileFeatureFromIntersectsArray?
}

export default ThreeDTilesLayer;
