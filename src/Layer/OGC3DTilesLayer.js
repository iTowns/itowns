import * as THREE from 'three';
import {
    TilesRenderer,
    GLTFStructuralMetadataExtension,
    GLTFMeshFeaturesExtension,
    GLTFCesiumRTCExtension,
    CesiumIonAuthPlugin,
    GoogleCloudAuthPlugin,
    ImplicitTilingPlugin,
} from '3d-tiles-renderer';

import GeometryLayer from 'Layer/GeometryLayer';
import iGLTFLoader from 'Parser/iGLTFLoader';
import { DRACOLoader } from 'ThreeExtended/loaders/DRACOLoader';
import { KTX2Loader } from 'ThreeExtended/loaders/KTX2Loader';
import ReferLayerProperties from 'Layer/ReferencingLayerProperties';
import PointsMaterial, {
    PNTS_MODE,
    PNTS_SHAPE,
    PNTS_SIZE_MODE,
    ClassificationScheme,
} from 'Renderer/PointsMaterial';

const _raycaster = new THREE.Raycaster();

// Internal instance of GLTFLoader, passed to 3d-tiles-renderer-js to support GLTF 1.0 and 2.0
// Temporary exported to be used in deprecated B3dmParser
export const itownsGLTFLoader = new iGLTFLoader();
itownsGLTFLoader.register(() => new GLTFMeshFeaturesExtension());
itownsGLTFLoader.register(() => new GLTFStructuralMetadataExtension());
itownsGLTFLoader.register(() => new GLTFCesiumRTCExtension());

// Instantiated by the first tileset. Used to share cache and download and parse queues between tilesets
let lruCache = null;
let downloadQueue = null;
let parseQueue = null;

export const OGC3DTILES_LAYER_EVENTS = {
    /**
     * Fired when a new root or child tile set is loaded
     * @event OGC3DTilesLayer#load-tile-set
     * @type {Object}
     * @property {Object} tileset - the tileset json parsed in an Object
     * @property {String} url - tileset url
     */
    LOAD_TILE_SET: 'load-tile-set',
    /**
     * Fired when a tile model is loaded
     * @event OGC3DTilesLayer#load-model
     * @type {Object}
     * @property {THREE.Group} scene - the model (tile content) parsed in a THREE.GROUP
     * @property {Object} tile - the tile metadata from the tileset
     */
    LOAD_MODEL: 'load-model',
    /**
     * Fired when a tile model is disposed
     * @event OGC3DTilesLayer#dispose-model
     * @type {Object}
     * @property {THREE.Group} scene - the model (tile content) that is disposed
     * @property {Object} tile - the tile metadata from the tileset
     */
    DISPOSE_MODEL: 'dispose-model',
    /**
     * Fired when a tiles visibility changes
     * @event OGC3DTilesLayer#tile-visibility-change
     * @type {Object}
     * @property {THREE.Group} scene - the model (tile content) parsed in a THREE.GROUP
     * @property {Object} tile - the tile metadata from the tileset
     * @property {boolean} visible - the tile visible state
     */
    TILE_VISIBILITY_CHANGE: 'tile-visibility-change',
};

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
    /**
     * Layer for [3D Tiles](https://www.ogc.org/standard/3dtiles/) datasets.
     * @extends Layer
     *
     * @param {String} id - unique layer id.
     * @param {Object} config - layer specific configuration
     * @param {OGC3DTilesSource} config.source - data source configuration
     * @param {String} [config.pntsMode= PNTS_MODE.COLOR] Point cloud coloring mode (passed to {@link PointsMaterial}).
     *      Only 'COLOR' or 'CLASSIFICATION' are possible. COLOR uses RGB colors of the points,
     *      CLASSIFICATION uses a classification property of the batch table to color points.
     * @param {ClassificationScheme}  [config.classificationScheme]  {@link PointsMaterial} classification scheme
     * @param {String} [config.pntsShape= PNTS_SHAPE.CIRCLE] Point cloud point shape. Only 'CIRCLE' or 'SQUARE' are possible.
     * (passed to {@link PointsMaterial}).
     * @param {String} [config.pntsSizeMode= PNTS_SIZE_MODE.VALUE] {@link PointsMaterial} Point cloud size mode (passed to {@link PointsMaterial}).
     * Only 'VALUE' or 'ATTENUATED' are possible. VALUE use constant size, ATTENUATED compute size depending on distance
     * from point to camera.
     * @param {Number} [config.pntsMinAttenuatedSize=3] Minimum scale used by 'ATTENUATED' size mode.
     * @param {Number} [config.pntsMaxAttenuatedSize=10] Maximum scale used by 'ATTENUATED' size mode.
     */
    constructor(id, config) {
        super(id, new THREE.Group(), { source: config.source });
        this.isOGC3DTilesLayer = true;

        this._handlePointsMaterialConfig(config);

        this.tilesRenderer = new TilesRenderer(this.source.url);
        if (config.source.isOGC3DTilesIonSource) {
            this.tilesRenderer.registerPlugin(new CesiumIonAuthPlugin({
                apiToken: config.source.accessToken,
                assetId: config.source.assetId,
                autoRefreshToken: true,
            }));
        } else if (config.source.isOGC3DTilesGoogleSource) {
            this.tilesRenderer.registerPlugin(new GoogleCloudAuthPlugin({
                apiToken: config.source.key,
                autoRefreshToken: true,
            }));
        }
        this.tilesRenderer.registerPlugin(new ImplicitTilingPlugin());

        this.tilesRenderer.manager.addHandler(/\.gltf$/, itownsGLTFLoader);

        this._setupCacheAndQueues();
        this._setupEvents();

        this.object3d.add(this.tilesRenderer.group);

        // Add an initialization step that is resolved when the root tileset is loaded (see this._setup below), meaning
        // that the layer will be marked ready when the tileset has been loaded.
        this._res = this.addInitializationStep();

        /**
         * @type {number}
         */
        this.sseThreshold = this.tilesRenderer.errorTarget;
        Object.defineProperty(this, 'sseThreshold', {
            get() { return this.tilesRenderer.errorTarget; },
            set(value) { this.tilesRenderer.errorTarget = value; },
        });

        if (config.sseThreshold) {
            this.sseThreshold = config.sseThreshold;
        }
    }

    /**
     * Store points material config so they can be used later to substitute points tiles material by our own PointsMaterial
     * These properties should eventually be managed through the Style API (see https://github.com/iTowns/itowns/issues/2336)
     * @param {Object} config - points material configuration as passed to the layer constructor.
     * @private
     */
    _handlePointsMaterialConfig(config) {
        this.pntsMode = config.pntsMode ?? PNTS_MODE.COLOR;
        this.pntsShape = config.pntsShape ?? PNTS_SHAPE.CIRCLE;
        this.classification = config.classification ?? ClassificationScheme.DEFAULT;
        this.pntsSizeMode = config.pntsSizeMode ?? PNTS_SIZE_MODE.VALUE;
        this.pntsMinAttenuatedSize = config.pntsMinAttenuatedSize || 3;
        this.pntsMaxAttenuatedSize = config.pntsMaxAttenuatedSize || 10;
    }

    /**
     * Sets the lruCache and download and parse queues so they are shared amongst all tilesets.
     * @private
     */
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

    /**
     * Binds 3d-tiles-renderer events to this layer.
     * @private
     */
    _setupEvents() {
        for (const ev of Object.values(OGC3DTILES_LAYER_EVENTS)) {
            this.tilesRenderer.addEventListener(ev, (e) => {
                this.dispatchEvent(e);
            });
        }
    }

    /**
     * Setup 3D tiles renderer js TilesRenderer with the camera, binds events and start updating. Executed when the
     * layer has been added to the view.
     * @param {View} view - the view the layer has been added to.
     * @private
     */
    _setup(view) {
        this.tilesRenderer.setCamera(view.camera3D);
        this.tilesRenderer.setResolutionFromRenderer(view.camera3D, view.renderer);
        // Setup whenReady to be fullfiled when the root tileset has been loaded
        let rootTilesetLoaded = false;
        this.tilesRenderer.addEventListener('load-tile-set', () => {
            view.notifyChange(this);
            if (!rootTilesetLoaded) {
                rootTilesetLoaded = true;
                this._res();
            }
        });
        this.tilesRenderer.addEventListener('load-model', ({ scene }) => {
            scene.traverse((obj) => {
                this._assignFinalMaterial(obj);
                this._assignFinalAttributes(obj);
            });
            view.notifyChange(this);
        });
        // Start loading tileset and tiles
        this.tilesRenderer.update();
    }

    /**
     * Replace materials from GLTFLoader by our own custom materials. Note that
     * the replaced materials are not compiled yet and will be disposed by the
     * GC.
     * @param {Object3D} model
     * @private
     */
    _assignFinalMaterial(model) {
        let material = model.material;

        if (model.isPoints) {
            const pointsMaterial = new PointsMaterial({
                mode: this.pntsMode,
                shape: this.pntsShape,
                classificationScheme: this.classification,
                sizeMode: this.pntsSizeMode,
                minAttenuatedSize: this.pntsMinAttenuatedSize,
                maxAttenuatedSize: this.pntsMaxAttenuatedSize,
            });
            pointsMaterial.copy(material);

            material = pointsMaterial;
        }

        if (material) {
            ReferLayerProperties(material, this);
        }

        model.material = material;
    }

    /**
     * @param {Object3D} model
     * @private
     */
    _assignFinalAttributes(model) {
        const geometry = model.geometry;
        const batchTable = model.batchTable;

        // Setup classification bufferAttribute
        if (model.isPoints) {
            const classificationData = batchTable?.getPropertyArray('Classification');
            if (classificationData) {
                geometry.setAttribute('classification',
                    new THREE.BufferAttribute(classificationData, 1),
                );
            }
        }
    }

    preUpdate(context) {
        this.scale = context.camera._preSSE;
        this.tilesRenderer.update();
        return null; // don't return any element because 3d-tiles-renderer already updates them
    }

    update() {
        // empty, elements are updated by 3d-tiles-renderer
    }

    /**
     * Deletes the layer and frees associated memory
     */
    delete() {
        this.tilesRenderer.dispose();
    }

    /**
     * Get the attributes for the closest intersection from a list of
     * intersects.
     * @param {Array} intersects -  An array containing all
     * objects picked under mouse coordinates computed with view.pickObjectsAt(..).
     * @returns {Object | null} - An object containing
     */
    getC3DTileFeatureFromIntersectsArray(intersects) {
        if (!intersects.length) { return null; }

        const { face, index, object } = intersects[0];

        /** @type{number|null} */
        let batchId;
        if (object.isPoints && index) {
            batchId = object.geometry.getAttribute('_BATCHID')?.getX(index) ?? index;
        } else if (object.isMesh && face) {
            batchId = object.geometry.getAttribute('_BATCHID')?.getX(face.a);
        }

        if (batchId === undefined) {
            return null;
        }

        let tileObject = object;
        while (!tileObject.batchTable) {
            tileObject = tileObject.parent;
        }

        return tileObject.batchTable.getDataFromId(batchId);
    }

    /**
     * Get all 3D objects (mesh and points primitives) as intersects at the
     * given non-normalized screen coordinates.
     * @param {View} view - The view instance.
     * @param {THREE.Vector2} coords - The coordinates to pick in the view. It
     * should have at least `x` and `y` properties.
     * @param {number} radius - Radius of the picking circle.
     * @param {Array} [target=[]] - Target array to push results too
     * @returns {Array} Array containing all target objects picked under the
     * specified coordinates.
     */
    pickObjectsAt(view, coords, radius, target = []) {
        const camera = view.camera.camera3D;
        _raycaster.setFromCamera(view.viewToNormalizedCoords(coords), camera);
        _raycaster.near = camera.near;
        _raycaster.far = camera.far;

        _raycaster.firstHitOnly = true;
        _raycaster.intersectObject(this.tilesRenderer.group, true, target);

        return target;
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

    /**
     * Executes a callback for each tile of this layer tileset.
     *
     * @param {Function} callback The callback to execute for each tile. Has the following two parameters:
     *  1. tile (Object) - the JSON tile
     *  2. scene (THREE.Object3D | null) - The tile content. Contains a `batchTable` property. Can be null if the tile
     *  has not yet been loaded.
    */
    forEachTile(callback) {
        this.tilesRenderer.traverse((tile) => {
            callback(tile, tile.cached.scene);
        });
    }
}

export default OGC3DTilesLayer;
