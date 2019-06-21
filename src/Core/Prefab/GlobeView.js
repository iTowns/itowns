import * as THREE from 'three';

import View, { VIEW_EVENTS } from 'Core/View';
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
    constructor(viewerDiv, coordCarto, options = {}) {
        THREE.Object3D.DefaultUp.set(0, 0, 1);
        // Setup View
        super('EPSG:4978', viewerDiv, options);

        // Configure camera
        let positionCamera;
        if (coordCarto.isCoordinates) {
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
        positionTargetCamera.altitude = 0;

        if (options.noControls) {
            this.camera.setPosition(positionCamera);
            this.camera.camera3D.lookAt(positionTargetCamera.as('EPSG:4978').toVector3());
        } else {
            this.controls = new GlobeControls(this, positionTargetCamera, positionCamera.altitude, ellipsoidSizes.x);
            this.controls.handleCollision = typeof (options.handleCollision) !== 'undefined' ? options.handleCollision : true;
        }

        this.tileLayer = tileLayer;

        this.addLayer(new Atmosphere());

        // GlobeView needs this.camera.resize to set perpsective matrix camera
        this.camera.resize(viewerDiv.clientWidth, viewerDiv.clientHeight);
    }

    addLayer(layer) {
        if (!layer) {
            return new Promise((resolve, reject) => reject(new Error('layer is undefined')));
        }
        if (layer.isColorLayer) {
            const colorLayerCount = this.getLayers(l => l.isColorLayer).length;
            layer.sequence = colorLayerCount;
            if ((layer.source.isWMTSSource || layer.source.isTMSSource)
                && layer.source.tileMatrixSet !== 'WGS84G'
                && layer.source.tileMatrixSet !== 'PM') {
                throw new Error('Only WGS84G and PM tileMatrixSet are currently supported for WMTS/TMS color layers');
            }
        } else if (layer.isElevationLayer) {
            if (layer.source.isWMTSSource && layer.source.tileMatrixSet !== 'WGS84G') {
                throw new Error('Only WGS84G tileMatrixSet is currently supported for WMTS elevation layers');
            }
        }

        return super.addLayer(layer, this.tileLayer);
    }
}

export default GlobeView;
