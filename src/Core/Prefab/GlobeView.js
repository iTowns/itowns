import * as THREE from 'three';

import View, { VIEW_EVENTS } from 'Core/View';
import GlobeControls from 'Controls/GlobeControls';
import Coordinates from 'Core/Geographic/Coordinates';

import GlobeLayer from 'Core/Prefab/Globe/GlobeLayer';
import Atmosphere from 'Core/Prefab/Globe/Atmosphere';
import CameraUtils from 'Utils/CameraUtils';

import CRS from 'Core/Geographic/Crs';
import { ellipsoidSizes } from 'Core/Math/Ellipsoid';

/**
 * Fires when the view is completely loaded. Controls and view's functions can be called then.
 * @event GlobeView#initialized
 * @property target {view} dispatched on view
 * @property type {string} initialized
 */
/**
 * Fires when a layer is added
 * @event GlobeView#layer-added
 * @property layerId {string} the id of the layer
 * @property target {view} dispatched on view
 * @property type {string} layers-added
 */
/**
 * Fires when a layer is removed
 * @event GlobeView#layer-removed
 * @property layerId {string} the id of the layer
 * @property target {view} dispatched on view
 * @property type {string} layers-added
 */
/**
 * Fires when the layers oder has changed
 * @event GlobeView#layers-order-changed
 * @property new {object}
 * @property new.sequence {array}
 * @property new.sequence.0 {number} the new layer at position 0
 * @property new.sequence.1 {number} the new layer at position 1
 * @property new.sequence.2 {number} the new layer at position 2
 * @property previous {object}
 * @property previous.sequence {array}
 * @property previous.sequence.0 {number} the previous layer at position 0
 * @property previous.sequence.1 {number} the previous layer at position 1
 * @property previous.sequence.2 {number} the previous layer at position 2
 * @property target {view} dispatched on view
 * @property type {string} layers-order-changed
 */


/**
 * Globe's EVENT
 * @property GLOBE_INITIALIZED {string} Deprecated: emit one time when globe is initialized (use VIEW_EVENTS.INITIALIZED instead).
 * @property LAYER_ADDED {string} Deprecated: emit when layer id added in viewer (use VIEW_EVENTS.LAYER_ADDED instead).
 * @property LAYER_REMOVED {string} Deprecated: emit when layer id removed in viewer (use VIEW_EVENTS.LAYER_REMOVED instead).
 * @property COLOR_LAYERS_ORDER_CHANGED {string} Deprecated: emit when  color layers order change (use VIEW_EVENTS.COLOR_LAYERS_ORDER_CHANGED instead).
 */

export const GLOBE_VIEW_EVENTS = {
    GLOBE_INITIALIZED: VIEW_EVENTS.INITIALIZED,
    LAYER_ADDED: VIEW_EVENTS.LAYER_ADDED,
    LAYER_REMOVED: VIEW_EVENTS.LAYER_REMOVED,
    COLOR_LAYERS_ORDER_CHANGED: VIEW_EVENTS.COLOR_LAYERS_ORDER_CHANGED,
};

class GlobeView extends View {
    /**
     * Creates a view of a globe.
     *
     * @constructor
     * @extends View
     *
     * @example <caption><b>Instance GlobeView.</b></caption>
     * var viewerDiv = document.getElementById('viewerDiv');
     * const placement = {
     *     coord: new itowns.Coordinates('EPSG:4326', 2.351323, 48.856712),
     *     range: 25000000,
     * }
     * var view = new itowns.GlobeView(viewerDiv, placement);
     *
     * @example <caption><b>Enable WebGl 1.0 instead of WebGl 2.0.</b></caption>
     * var viewerDiv = document.getElementById('viewerDiv');
     * const placement = {
     *     coord: new itowns.Coordinates('EPSG:4326', 2.351323, 48.856712),
     *     range: 25000000,
     * }
     * var view = new itowns.GlobeView(viewerDiv, placement, {  renderer: { isWebGL2: false } });
     *
     * @param {HTMLDivElement} viewerDiv - Where to attach the view and display it
     * in the DOM.
     * @param {CameraTransformOptions} placement - An object to place view
     * @param {object=} options - See options of {@link View}.
     */
    constructor(viewerDiv, placement = {}, options = {}) {
        THREE.Object3D.DefaultUp.set(0, 0, 1);
        // Setup View
        super('EPSG:4978', viewerDiv, options);
        this.isGlobeView = true;

        this.camera.camera3D.near = Math.max(15.0, 0.000002352 * ellipsoidSizes.x);
        this.camera.camera3D.far = ellipsoidSizes.x * 10;

        const tileLayer = new GlobeLayer('globe', options.object3d, options);
        this.mainLoop.gfxEngine.label2dRenderer.infoTileLayer = tileLayer.info;

        const sun = new THREE.DirectionalLight();
        sun.position.set(-0.5, 0, 1);
        sun.updateMatrixWorld(true);
        tileLayer.object3d.add(sun);

        this.addLayer(tileLayer);
        this.tileLayer = tileLayer;

        placement.coord = placement.coord || new Coordinates('EPSG:4326', 0, 0);
        placement.tilt = placement.tilt || 89.5;
        placement.heading = placement.heading || 0;
        placement.range = placement.range || ellipsoidSizes.x * 2.0;

        if (options.noControls) {
            CameraUtils.transformCameraToLookAtTarget(this, this.camera.camera3D, placement);
        } else {
            this.controls = new GlobeControls(this, placement);
            this.controls.handleCollision = typeof (options.handleCollision) !== 'undefined' ? options.handleCollision : true;
        }

        this.addLayer(new Atmosphere());

        // GlobeView needs this.camera.resize to set perpsective matrix camera
        this.camera.resize(viewerDiv.clientWidth, viewerDiv.clientHeight);
    }

    /**
     * Add layer in viewer.
     * The layer id must be unique.
     *
     * The `layer.whenReady` is a promise that resolves when
     * the layer is done. This promise is also returned by
     * `addLayer` allowing to chain call.
     *
     * The layer added is attached, by default to `GlobeLayer` (`GlobeView.tileLayer`).
     * If you want add a unattached layer use `View#addLayer` parent method.
     *
     * @param {LayerOptions|Layer|GeometryLayer} layer The layer to add in view.
     * @return {Promise} a promise resolved with the new layer object when it is fully initialized or rejected if any error occurred.
     */
    addLayer(layer) {
        if (!layer || !layer.isLayer) {
            return Promise.reject(new Error('Add Layer type object'));
        }
        if (layer.isColorLayer) {
            if (!this.tileLayer.tileMatrixSets.includes(CRS.formatToTms(layer.source.crs))) {
                return layer._reject(`Only ${this.tileLayer.tileMatrixSets} tileMatrixSet are currently supported for color layers`);
            }
        } else if (layer.isElevationLayer) {
            if (CRS.formatToTms(layer.source.crs) !== this.tileLayer.tileMatrixSets[0]) {
                return layer._reject(`Only ${this.tileLayer.tileMatrixSets[0]} tileMatrixSet is currently supported for elevation layers`);
            }
        }

        return super.addLayer(layer, this.tileLayer);
    }

    getPixelsToDegrees(pixels = 1, screenCoord) {
        return this.getMetersToDegrees(this.getPixelsToMeters(pixels, screenCoord));
    }

    getPixelsToDegreesFromDistance(pixels = 1, distance = 1) {
        return this.getMetersToDegrees(this.getPixelsToMetersFromDistance(pixels, distance));
    }

    getMetersToDegrees(meters = 1) {
        return THREE.MathUtils.radToDeg(2 * Math.asin(meters / (2 * ellipsoidSizes.x)));
    }
}

export default GlobeView;
