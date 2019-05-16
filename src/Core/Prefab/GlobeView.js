import * as THREE from 'three';

import View, { VIEW_EVENTS } from 'Core/View';
import { MAIN_LOOP_EVENTS } from 'Core/MainLoop';
import { COLOR_LAYERS_ORDER_CHANGED } from 'Renderer/ColorLayersOrdering';
import GlobeControls from 'Controls/GlobeControls';

import GlobeLayer from 'Core/Prefab/Globe/GlobeLayer';
import Atmosphere from 'Core/Prefab/Globe/Atmosphere';

import Coordinates from 'Core/Geographic/Coordinates';
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
 * @property GLOBE_INITIALIZED {string} emit one time when globe is initialized
 * @property LAYER_ADDED {string} emit when layer id added in viewer
 * @property LAYER_REMOVED {string} emit when layer id removed in viewer
 * @property COLOR_LAYERS_ORDER_CHANGED {string} emit when  color layers order change
 */

export const GLOBE_VIEW_EVENTS = {
    GLOBE_INITIALIZED: 'initialized',
    LAYER_ADDED: 'layer-added',
    LAYER_REMOVED: 'layer-removed',
    COLOR_LAYERS_ORDER_CHANGED,
};

/**
 * Creates a view of a globe.
 *
 * @constructor
 *
 * @example
 * var viewerDiv = document.getElementById('viewerDiv');
 * var position = new itowns.Coordinates('WGS84', 2.35, 48.8, 25e6);
 * var view = new itowns.GlobeView(viewerDiv, position);
 *
 * @example
 * var viewerDiv = document.getElementById('viewerDiv');
 * var position = { longitude: 2.35, latitude: 48.8, altitude: 25e6 };
 * var view = new itowns.GlobeView(viewerDiv, position);
 *
 * @param {HTMLDivElement} viewerDiv - Where to attach the view and display it
 * in the DOM.
 * @param {object|Coordinates} coordCarto - An object containing three
 * properties: longitude, latitude and altitude. It will help placing the camera
 * on the globe at the creation.
 * @param {object=} options - See options of {@link View}.
 */
function GlobeView(viewerDiv, coordCarto, options = {}) {
    THREE.Object3D.DefaultUp.set(0, 0, 1);
    // Setup View
    View.call(this, 'EPSG:4978', viewerDiv, options);

    // Configure camera
    let positionCamera;
    if (coordCarto instanceof Coordinates) {
        positionCamera = coordCarto.as('EPSG:4326');
    } else {
        positionCamera = new Coordinates('EPSG:4326',
            coordCarto.longitude,
            coordCarto.latitude,
            coordCarto.altitude);
    }

    this.camera.camera3D.near = Math.max(15.0, 0.000002352 * ellipsoidSizes.x);
    this.camera.camera3D.far = ellipsoidSizes.x * 10;

    const tileLayer = new GlobeLayer('globe', options.object3d, options);

    const sun = new THREE.DirectionalLight();
    sun.position.set(-0.5, 0, 1);
    sun.updateMatrixWorld(true);
    tileLayer.object3d.add(sun);

    this.addLayer(tileLayer);
    // Configure controls
    const positionTargetCamera = positionCamera.clone();
    positionTargetCamera.setAltitude(0);

    if (options.noControls) {
        this.camera.setPosition(positionCamera);
        this.camera.camera3D.lookAt(positionTargetCamera.as('EPSG:4978').xyz());
    } else {
        this.controls = new GlobeControls(this, positionTargetCamera, positionCamera.altitude(), ellipsoidSizes.x);
        this.controls.handleCollision = typeof (options.handleCollision) !== 'undefined' ? options.handleCollision : true;
    }

    this._fullSizeDepthBuffer = null;

    this.addFrameRequester(MAIN_LOOP_EVENTS.BEFORE_RENDER, () => {
        if (this._fullSizeDepthBuffer != null) {
            // clean depth buffer
            this._fullSizeDepthBuffer = null;
        }
    });

    this.tileLayer = tileLayer;

    this.addLayer(new Atmosphere());

    const fn = () => {
        this.removeEventListener(VIEW_EVENTS.LAYERS_INITIALIZED, fn);
        this.dispatchEvent({ type: GLOBE_VIEW_EVENTS.GLOBE_INITIALIZED });
    };

    // GlobeView needs this.camera.resize to set perpsective matrix camera
    this.camera.resize(viewerDiv.clientWidth, viewerDiv.clientHeight);

    this.addEventListener(VIEW_EVENTS.LAYERS_INITIALIZED, fn);
}

GlobeView.prototype = Object.create(View.prototype);
GlobeView.prototype.constructor = GlobeView;

GlobeView.prototype.addLayer = function addLayer(layer) {
    if (!layer) {
        return new Promise((resolve, reject) => reject(new Error('layer is undefined')));
    }
    if (layer.isColorLayer) {
        const colorLayerCount = this.getLayers(l => l.isColorLayer).length;
        layer.sequence = colorLayerCount;
    } else if (layer.isElevationLayer) {
        if (layer.source.isWMTSSource && layer.source.tileMatrixSet !== 'WGS84G') {
            throw new Error('Only WGS84G tileMatrixSet is currently supported for WMTS elevation layers');
        }
    }
    const layerId = layer.id;
    const layerPromise = View.prototype.addLayer.call(this, layer, this.tileLayer);

    this.dispatchEvent({
        type: GLOBE_VIEW_EVENTS.LAYER_ADDED,
        layerId,
    });

    return layerPromise;
};

/**
 * Removes a specific imagery layer from the current layer list. This removes layers inserted with attach().
 * @example
 * view.removeLayer('layerId');
 * @param      {string}   layerId      The identifier
 * @return     {boolean}
 */
GlobeView.prototype.removeLayer = function removeLayer(layerId) {
    if (View.prototype.removeLayer.call(this, layerId)) {
        this.dispatchEvent({
            type: GLOBE_VIEW_EVENTS.LAYER_REMOVED,
            layerId,
        });
        return true;
    }
};

export default GlobeView;
