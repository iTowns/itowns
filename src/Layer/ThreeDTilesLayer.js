import * as THREE from 'three';
import { CesiumIonTilesRenderer, GoogleTilesRenderer, LRUCache, PriorityQueue, TilesRenderer } from '3d-tiles-renderer';
import GeometryLayer from 'Layer/GeometryLayer';
import iGLTFLoader from 'Parser/iGLTFLoader';

export const itownsGLTFLoader = new iGLTFLoader();

// TODO: find a way to configure max LRUCache and PriorityQueue
// TODO: syntax not possible with current API -> open a PR on its side
// const lruCache = new LRUCache();
// const downloadQueue = new PriorityQueue();
// const parseQueue = new PriorityQueue();

// TODO: Check GeometryLayer methods that should be overriden
// TODO: tests
class ThreeDTilesLayer extends GeometryLayer {
    constructor(id, config) {
        super(id, new THREE.Group(), { source: config.source });
        this.isThreeDTilesLayer = true;

        // Note: C3DTilesIonSource and C3DTilesGoogleSource are no longer very useful but we should keep them
        // with their logic until we have C3DTilesLayer and without after to keep itowns source/layer logic
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

    preUpdate() {
        this.tilesRenderer.update();
        return null; // don't return any element because 3d-tiles-renderer updates them
    }

    update() {
        // empty, elements are updated by 3d-tiles-renderer
    }

    // TODO: what happens if the layer is added to multiple views? Should we store multiple tilesRenderer?
    // How does it work for other layer types?
    setup(view) {
        this.tilesRenderer.setCamera(view.camera3D);
        this.tilesRenderer.setResolutionFromRenderer(view.camera3D, view.renderer);
        // Set this in the method called by view.addLayer
        this.tilesRenderer.onLoadTileSet = (tileSet) => {
            this.tileSet = tileSet; // TODO: needed? + what if multiple tilesets?
            view.notifyChange(this);
        };
        this.tilesRenderer.onLoadModel = (model) => {
            // TODO: need to store model?
            view.notifyChange(this); // TODO: specify this layer?
        };
    }
}

export default ThreeDTilesLayer;
