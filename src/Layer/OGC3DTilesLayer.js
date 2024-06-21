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

// TODO: This syntax is currently not possible with the current 3d-tiles-renderer-js API -> open a PR
// It will allow to share cache and download/parse queue between tilesets
// const lruCache = new LRUCache();
// const downloadQueue = new PriorityQueue();
// const parseQueue = new PriorityQueue();

class OGC3DTilesLayer extends GeometryLayer {
    constructor(id, config) {
        super(id, new THREE.Group(), { source: config.source });
        this.isOGC3DTilesLayer = true;

        // TODO: should this really be done here and like this (i.e. each option is passed in individually?)
        //  I think we should use the Style API instead :)
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

        // Set cache, download and parse queues to be shared amongst 3D tiles layers (waiting for 3d-tiles-renderer-js api change)
        // this.tilesRenderer.lruCache = lruCache;
        // this.tilesRenderer.downloadQueue = downloadQueue;
        // this.tilesRenderer.parseQueue = parseQueue;

        this.object3d.add(this.tilesRenderer.group);
    }

    // TODO: what happens if the layer is added to multiple views? Should we store multiple tilesRenderer?
    // How does it work for other layer types?
    _setup(view) {
        this.tilesRenderer.setCamera(view.camera3D);
        this.tilesRenderer.setResolutionFromRenderer(view.camera3D, view.renderer);
        // TODO: should we store the tileset and our own list of models? or at least provide an API to access them
        this.tilesRenderer.onLoadTileSet = () => {
            view.notifyChange(this);
        };
        this.tilesRenderer.onLoadModel = (model) => {
            if (model.isPoints) {
                this._replacePointsMaterial(model);
            }
            view.notifyChange(this);
        };
    }

    // TODO: Not fond of this implementation, I would rather add the possibility to pass a PointsMaterial to
    //  3d-tiles-renderer-js TilesRenderer instead
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
        // TODO: add the possibility to configure the classification attribute name
        if (model.batchTable) {
            const classificationData =  model.batchTable.getData('Classification');
            if (classificationData) {
                model.geometry.setAttribute('classification', new THREE.BufferAttribute(classificationData, 1));
            }
        }
    }

    _handlePointsMaterialConfig(config) {
        this.pntsMode = config.pntsMode;
        this.pntsShape = config.pntsShape;
        this.classification = config.classification;
        this.pntsSizeMode = config.pntsSizeMode;
        this.pntsMinAttenuatedSize = config.pntsMinAttenuatedSize || 3;
        this.pntsMaxAttenuatedSize = config.pntsMaxAttenuatedSize || 10;
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

export default OGC3DTilesLayer;
