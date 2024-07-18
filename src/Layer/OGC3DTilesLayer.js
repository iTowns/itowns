import * as THREE from 'three';
import { CesiumIonTilesRenderer, GoogleTilesRenderer, TilesRenderer } from '3d-tiles-renderer';
import GeometryLayer from 'Layer/GeometryLayer';
import iGLTFLoader from 'Parser/iGLTFLoader';
import { DRACOLoader } from 'ThreeExtended/loaders/DRACOLoader';
import { KTX2Loader } from 'ThreeExtended/loaders/KTX2Loader';
import PointsMaterial from 'Renderer/PointsMaterial';
import ReferLayerProperties from 'Layer/ReferencingLayerProperties';

// Internal instance of GLTFLoader, passed to 3d-tiles-renderer-js to support GLTF 1.0 and 2.0
// Temporary exported to be used in deprecated B3dmParser
export const itownsGLTFLoader = new iGLTFLoader();

// Instantiated by the first tileset. Used to share cache and download and parse queues between tilesets
let lruCache = null;
let downloadQueue = null;
let parseQueue = null;

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

class OGC3DTilesLayer extends GeometryLayer {
    constructor(id, config) {
        super(id, new THREE.Group(), { source: config.source });
        this.isOGC3DTilesLayer = true;

        this._handlePointsMaterialConfig(config);

        if (config.source.isOGC3DTilesIonSource) {
            this.tilesRenderer = new CesiumIonTilesRenderer(config.source.assetId, config.source.accessToken);
        } else if (config.source.isOGC3DTilesGoogleSource) {
            this.tilesRenderer = new GoogleTilesRenderer(config.source.key);
        } else if (config.source.isOGC3DTilesSource) {
            this.tilesRenderer = new TilesRenderer(this.source.url);
        } else {
            console.error('[OGC3DTilesLayer]: Unsupported source, cannot create OGC3DTilesLayer.');
        }

        this.tilesRenderer.manager.addHandler(/\.gltf$/, itownsGLTFLoader);

        this._setupCacheAndQueues();

        this.object3d.add(this.tilesRenderer.group);

        // Add an initialization step that is resolved when the root tileset is loaded (see this._setup below), meaning
        // that the layer will be marked ready when the tileset has been loaded.
        this._res = this.addInitializationStep();
    }

    // Store points material config so they can be used later to substitute points tiles material by our own PointsMaterial
    // These properties should eventually be managed through the Style API (see https://github.com/iTowns/itowns/issues/2336)
    _handlePointsMaterialConfig(config) {
        this.pntsMode = config.pntsMode;
        this.pntsShape = config.pntsShape;
        this.classification = config.classification;
        this.pntsSizeMode = config.pntsSizeMode;
        this.pntsMinAttenuatedSize = config.pntsMinAttenuatedSize || 3;
        this.pntsMaxAttenuatedSize = config.pntsMaxAttenuatedSize || 10;
    }

    // Sets the lruCache and download and parse queues so they are shared amongst all tilesets
    _setupCacheAndQueues() {
        if (lruCache === null) {
            lruCache = this.tilesRenderer.lruCache;
        } else {
            this.tilesRenderer.lruCache = lruCache;
        }
        if (downloadQueue === null) {
            downloadQueue = this.tilesRenderer.downloadQueue;
        } else {
            this.tilesRenderer.downloadQueue = downloadQueue;
        }
        if (parseQueue === null) {
            parseQueue = this.tilesRenderer.parseQueue;
        } else {
            this.tilesRenderer.parseQueue = parseQueue;
        }
    }

    // Setup 3D tiles renderer js TilesRenderer with the camera, binds events and start updating. Executed when the
    // layer has been added to the view.
    _setup(view) {
        this.tilesRenderer.setCamera(view.camera3D);
        this.tilesRenderer.setResolutionFromRenderer(view.camera3D, view.renderer);
        // Setup whenReady to be fullfiled when the root tileset has been loaded
        let rootTilesetLoaded = false;
        this.tilesRenderer.onLoadTileSet = () => {
            view.notifyChange(this);
            if (!rootTilesetLoaded) {
                rootTilesetLoaded = true;
                this._res();
            }
        };
        this.tilesRenderer.onLoadModel = (model) => {
            if (model.isPoints) {
                this._replacePointsMaterial(model);
            }
            view.notifyChange(this);
        };
        // Start loading tileset and tiles
        this.tilesRenderer.update();
    }

    // Replaces points tiles material with our own PointsMaterial
    _replacePointsMaterial(model) {
        if (!model || !model.isPoints) { return; }
        const oldMat = model.material;
        model.material = new PointsMaterial({
            mode: this.pntsMode,
            shape: this.pntsShape,
            classificationScheme: this.classification,
            sizeMode: this.pntsSizeMode,
            minAttenuatedSize: this.pntsMinAttenuatedSize,
            maxAttenuatedSize: this.pntsMaxAttenuatedSize,
        });
        // Copy values from the material that are modified in 3DtilesRendererJS PntsLoader depending on the source data
        model.material.vertexColors = oldMat.vertexColors;
        model.material.transparent = oldMat.transparent;
        model.material.opacity = oldMat.opacity;
        model.material.depthWrite = oldMat.depthWrite;
        model.material.color = oldMat.color;
        oldMat.dispose();
        ReferLayerProperties(model.material, this);
        // Setup classification bufferAttribute
        if (model.batchTable) {
            const classificationData =  model.batchTable.getData('Classification');
            if (classificationData) {
                model.geometry.setAttribute('classification', new THREE.BufferAttribute(classificationData, 1));
            }
        }
    }

    preUpdate() {
        this.tilesRenderer.update();
        return null; // don't return any element because 3d-tiles-renderer updates them
    }

    update() {
        // empty, elements are updated by 3d-tiles-renderer
    }

    delete() {
        this.tilesRenderer.dispose();
    }

    // eslint-disable-next-line no-unused-vars
    attach(layer) {
        console.warn('[OGC3DTilesLayer]: Attaching / detaching layers is not yet implemented for OGC3DTilesLayer.');
    }

    // eslint-disable-next-line no-unused-vars
    detach(layer) {
        console.warn('[OGC3DTilesLayer]: Attaching / detaching layers is not yet implemented for OGC3DTilesLayer.');
        return true;
    }

    // eslint-disable-next-line no-unused-vars
    getObjectToUpdateForAttachedLayers(obj) {
        return null;
    }
}

export default OGC3DTilesLayer;
