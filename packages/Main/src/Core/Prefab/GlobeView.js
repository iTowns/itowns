import * as THREE from 'three';

import View, { VIEW_EVENTS } from 'Core/View';
import GlobeControls from 'Controls/GlobeControls';
import { Coordinates, ellipsoidSizes } from '@itowns/geographic';
import GlobeLayer from 'Core/Prefab/Globe/GlobeLayer';
import CameraUtils from 'Utils/CameraUtils';
import WebXR from 'Renderer/WebXR';
import SkyManager from 'Core/Prefab/Globe/SkyManager';

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
     * @param {HTMLDivElement} viewerDiv - Where to attach the view and display it
     * in the DOM.
     * @param {CameraTransformOptions|Extent} placement - An object to place view
     * @param {object} [options] - See options of {@link View}.
     * @param {Object} [options.controls] - See options of {@link GlobeControls}
     * @param {Object} [options.webXR] - WebXR configuration - its presence alone
     * enable WebXR to switch on VR visualization.
     * @param {function} [options.webXR.callback] - WebXR rendering callback.
     * @param {boolean} [options.webXR.controllers] - Enable the webXR controllers handling.
     * @param {boolean} [options.dynamicCameraNearFar=true] - The camera's near and far are automatically adjusted.
     * @param {number} [options.farFactor=0.3] - Controls the far plane distance at low altitudes.
     * Value between 0 and 1. Lower values reduce far distance near the ground. At higher altitudes,
     * far distance transitions to full horizon distance.
     * @param {number} [options.maxFarAltitude=50000] - the altitude at which the horizon is fully visible (meters).
     * @param {number} [options.minFarDistance=5000] - the minimum horizon distance.
     * Between 0 and 1.
     * @param {number} [options.fogSpread=0.5] - Proportion of the visible depth range that contains fog.
     * Between 0 and 1.
     * @param {boolean} [options.realisticLighting=false] - Enable realistic lighting.
     * If true, it can later be switched by setting this.skyManager.enabled to true/false.
     * If false, it will be impossible to enable it later on.
     */
    constructor(viewerDiv, placement = {}, options = {}) {
        THREE.Object3D.DEFAULT_UP.set(0, 0, 1);
        // Setup View
        super('EPSG:4978', viewerDiv, options);
        this.isGlobeView = true;

        this.camera3D.near = Math.max(15.0, 0.000002352 * ellipsoidSizes.x);
        this.camera3D.far = ellipsoidSizes.x * 10;

        this.fogSpread = options.fogSpread ?? 0.4;
        this.farFactor = options.farFactor ?? 0.3;
        this.maxFarAltitude = options.maxFarAltitude ?? 50000;
        // 5km corresponds to the theoretical distance for a person at sea level
        this.minFarDistance = options.minFarDistance ?? 5000;

        const tileLayer = new GlobeLayer('globe', options.object3d, options);
        this.mainLoop.gfxEngine.label2dRenderer.infoTileLayer = tileLayer.info;

        this.addLayer(tileLayer);
        this.tileLayer = tileLayer;
        this.horizonScaleFactor = 1;

        if (!placement.isExtent) {
            placement.coord = placement.coord || new Coordinates('EPSG:4326', 0, 0);
            placement.tilt = placement.tilt || 89.5;
            placement.heading = placement.heading || 0;
            placement.range = placement.range || ellipsoidSizes.x * 2.0;
        }

        if (options.noControls) {
            CameraUtils.transformCameraToLookAtTarget(this, this.camera3D, placement);

            // In this case, since the camera's near and far properties aren't
            // dynamically computed, the default fog won't be adapted, so don't enable it
        } else {
            this.controls = new GlobeControls(this, placement, options.controls);
            this.controls.handleCollision = typeof (options.handleCollision) !== 'undefined' ? options.handleCollision : true;

            if (options.dynamicCameraNearFar || options.dynamicCameraNearFar === undefined) {
                this.scene.fog = new THREE.Fog(0xe2edff, 1, 1000); // default fog
                this.addEventListener(VIEW_EVENTS.CAMERA_MOVED, this._updateCameraRangeAndFog.bind(this));
            }
        }

        // GlobeView needs this.camera.resize to set perpsective matrix camera
        this.camera.resize(viewerDiv.clientWidth, viewerDiv.clientHeight);

        if (options.webXR) {
            this.webXR = new WebXR(this, typeof options.webXR === 'boolean' ? {} : options.webXR);
            this.webXR.initializeWebXR();
        }

        if (options.realisticLighting === true) {
            this.skyManager = new SkyManager(this);
        }
    }

    /**
     * Internal method to update the camera's near and far planes, and the scene's fog
     * based on the current camera position and altitude.
     * @private
     */
    _updateCameraRangeAndFog() {
        const globeRadiusMin = Math.min(ellipsoidSizes.x, ellipsoidSizes.y, ellipsoidSizes.z);

        // maximum possible distance from ground to camera
        const camToSeaLevel = new Coordinates(this.referenceCrs)
            .setFromVector3(this.camera3D.position)
            .as(this.tileLayer.extent.crs)
            .z;

        const camToGroundDistMin = camToSeaLevel - View.ALTITUDE_MAX;
        this.camera3D.near = Math.max(1, camToGroundDistMin * this.fovDepthFactor);

        this.horizonScaleFactor = this.computeHorizonScaleFactor(camToSeaLevel);
        const behindGlobeDistance = (this.camera3D.position.length() + globeRadiusMin);

        // Set the far plane to scaled horizon distance
        if (this.horizonScaleFactor < 1 && (!this.skyManager || !this.skyManager.enabled)) {
            // camera's position and magnitude in worldToScaledEllipsoid system
            const cameraPosition = new THREE.Vector3();
            cameraPosition.copy(this.camera3D.position).applyMatrix4(this.tileLayer.worldToScaledEllipsoid);

            // Minimum distance from camera to the horizon (The globe is not a perfect sphere, this is not constant)
            const horizonDistance = Math.sqrt(Math.max(0, cameraPosition.lengthSq() - 1)) * globeRadiusMin;
            const reducedHorizonDist = horizonDistance * this.horizonScaleFactor;
            this.camera3D.far = Math.max(this.minFarDistance, reducedHorizonDist);
        } else {
            // Setting the far plane behind the globe when scale factor is 1 or when realistic lighting is enabled.
            // Three-geospatial aerial-perspective is not working well with closer far-plane while being dense
            // enough to hide tile culling.
            this.camera3D.far = behindGlobeDistance;
        }

        this.camera3D.updateProjectionMatrix();

        const fog = this.scene.fog;
        if (!fog) { return; }
        // Fog is only visible when the horizon is scaled down.
        fog.far = this.camera3D.far;
        fog.near = fog.far - this.fogSpread * (fog.far - this.camera3D.near);
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
            if (!this.tileLayer.tileMatrixSets.includes(layer.source.crs)) {
                return layer._reject(`Only ${this.tileLayer.tileMatrixSets} tileMatrixSet are currently supported for color layers`);
            }
        } else if (layer.isElevationLayer) {
            if (layer.source.crs !== this.tileLayer.tileMatrixSets[0]) {
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

    /**
     * This factor reduces the visible horizon at low altitudes based on farFactor and maxFarAltitude.
     * farFactor corresponds to its minimum and maxFarAltitude the altitude at which the horizon is fully visible.
     * @param {number} altitude - Camera altitude above sea level in meters
     * @returns {number} Scale factor between farFactor and 1
     */
    computeHorizonScaleFactor(altitude) {
        if (this.farFactor === 1 || altitude >= this.maxFarAltitude) {
            return 1;
        }
        return this.farFactor + altitude / (this.maxFarAltitude / (1 - this.farFactor));
    }
}

export default GlobeView;
