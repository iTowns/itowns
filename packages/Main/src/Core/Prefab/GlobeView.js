import * as THREE from 'three';

import View, { VIEW_EVENTS } from 'Core/View';
import GlobeControls from 'Controls/GlobeControls';
import { Coordinates, ellipsoidSizes } from '@itowns/geographic';
import GlobeLayer from 'Core/Prefab/Globe/GlobeLayer';
import CameraUtils from 'Utils/CameraUtils';
import WebXR from 'Renderer/WebXR';
import SkyManager from 'Core/Prefab/Globe/SkyManager';
import SunLightLayer from 'Layer/SunLightLayer';

/**
 * Fires when the view is completely loaded. Controls and view's functions can be called then.
 * @event GlobeView#initialized
 * @property {View} target - the view that dispatched the event
 * @property {string} type - initialized
 */
/**
 * Fires when a layer is added
 * @event GlobeView#"layer-added"
 * @property {string} layerId - the id of the layer that was added
 * @property {View} target - the view that dispatched the event
 * @property {string} type - layers-added
 */
/**
 * Fires when a layer is removed
 * @event GlobeView#"layer-removed"
 * @property {string} layerId - the id of the layer that was removed
 * @property {View} target - the view that dispatched the event
 * @property {string} type - layers-added
 */
/**
 * Fires when the layers oder has changed
 * @event GlobeView#"layers-order-changed"
 * @property {object} new - the new layers order
 * @property {number[]} new.sequence - the new layers order
 * @property {object} previous - the previous layers order
 * @property {number[]} previous.sequence - the previous layers order
 * @property {View} target - the view that dispatched the event
 * @property {string} type - layers-order-changed
 */


/**
 * Globe's EVENT
 * @property {string} GLOBE_INITIALIZED - Deprecated: emit one time when globe is initialized (use VIEW_EVENTS.INITIALIZED instead).
 * @property {string} LAYER_ADDED - Deprecated: emit when layer id added in viewer (use VIEW_EVENTS.LAYER_ADDED instead).
 * @property {string} LAYER_REMOVED - Deprecated: emit when layer id removed in viewer (use VIEW_EVENTS.LAYER_REMOVED instead).
 * @property {string} COLOR_LAYERS_ORDER_CHANGED - Deprecated: emit when  color layers order change (use VIEW_EVENTS.COLOR_LAYERS_ORDER_CHANGED instead).
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
     * @param {object} [options.controls] - See options of {@link GlobeControls}
     * @param {object} [options.webXR] - WebXR configuration - its presence alone
     * enable WebXR to switch on VR visualization.
     * @param {Function} [options.webXR.callback] - WebXR rendering callback.
     * @param {boolean} [options.webXR.controllers] - Enable the webXR controllers handling.
     * @param {boolean} [options.dynamicCameraNearFar=true] - The camera's near and far are automatically adjusted.
     * @param {number} [options.farFactor=0.3] - Controls the far plane distance at low altitudes.
     * Value between 0 and 1. Lower values reduce far distance near the ground. At higher altitudes,
     * far distance transitions to full horizon distance.
     * @param {number} [options.maxFarAltitude=50000] - the altitude at which the horizon is fully visible (meters).
     * @param {number} [options.minFarDistance=5000] - the minimum horizon distance (meters).
     * @param {number} [options.fogSpread=0.5] - Proportion of the visible depth range that contains fog.
     * Between 0 and 1.
     * @param {boolean} [options.realisticLighting=false] - Enable realistic lighting.
     * If true, it can later be switched by setting this.skyManager.enabled to true/false.
     * If false, it will be impossible to enable it later on.
     * @param {boolean} [options.shadows=false] - Enable shadow map rendering. Can be toggled
     * later via `this.shadows`.
     */
    constructor(viewerDiv, placement = {}, options = {}) {
        THREE.Object3D.DEFAULT_UP.set(0, 0, 1);
        // Setup View
        super('EPSG:4978', viewerDiv, options);
        this.isGlobeView = true;

        this.camera3D.near = Math.max(15.0, 0.000002352 * ellipsoidSizes.x);
        this.camera3D.far = ellipsoidSizes.x * 10;

        this.farFactor = options.farFactor ?? 0.3;
        this.maxFarAltitude = options.maxFarAltitude ?? 80000;
        this.minFarDistance = options.minFarDistance ?? 10000;

        const tileLayer = new GlobeLayer('globe', options.object3d, options);
        this.mainLoop.gfxEngine.label2dRenderer.infoTileLayer = tileLayer.info;

        this.addLayer(tileLayer);
        this.tileLayer = tileLayer;

        this.horizonScaleFactor = 1;
        this.horizonDistance = null;
        this.globeRadiusMin = Math.min(ellipsoidSizes.x, ellipsoidSizes.y, ellipsoidSizes.z);

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
                this.addEventListener(VIEW_EVENTS.INITIALIZED, () => this.updateDynamicNearFar());
                this.addEventListener(VIEW_EVENTS.CAMERA_MOVED, () => this.updateDynamicNearFar());
            }
        }

        // GlobeView needs this.camera.resize to set perpsective matrix camera
        this.camera.resize(viewerDiv.clientWidth, viewerDiv.clientHeight);

        if (options.webXR) {
            this.webXR = new WebXR(this, typeof options.webXR === 'boolean' ? {} : options.webXR);
            this.webXR.initializeWebXR();
        }

        this.date = new Date(); // now

        // Sunlight and shadow layer
        this.sunLightLayer = new SunLightLayer(this);
        this.addLayer(this.sunLightLayer);

        if (options.realisticLighting === true) {
            this.skyManager = new SkyManager(this);
        }

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        if (options.shadows === true) {
            this.shadows = true;
        }
    }

    updateDynamicNearFar() {
        // maximum possible distance from ground to camera
        const camToSeaLevel = new Coordinates(this.referenceCrs)
            .setFromVector3(this.camera3D.position)
            .as(this.tileLayer.extent.crs)
            .z;

        this.horizonScaleFactor = this.computeHorizonScaleFactor(camToSeaLevel);
        this.horizonDistance = this.computeHorizonDistance(camToSeaLevel);

        this.camera3D.near = this.computeCameraNear(camToSeaLevel);
        this.camera3D.far = this.computeCameraFar(camToSeaLevel);

        this.camera3D.updateProjectionMatrix();
    }

    /**
     * This factor scales down the visible horizon at low altitudes based on farFactor and maxFarAltitude.
     * farFactor sets its minimum at sea level and maxFarAltitude the altitude at which the horizon is fully visible.
     * @param {number} altitude - Camera altitude above sea level in meters
     * @returns {number} Scale factor between farFactor and 1
     */
    computeHorizonScaleFactor(altitude) {
        if (this.farFactor === 1 || altitude >= this.maxFarAltitude) {
            return 1;
        }
        if (altitude < 0) {
            return this.farFactor;
        }

        // Normalize altitude, 0 at maxFarAltitude, 1 at sea level
        const t = altitude / this.maxFarAltitude;
        // Linear interpolation between farFactor and 1
        return this.farFactor + t * (1 - this.farFactor);
    }

    computeHorizonDistance(altitude) {
        const R = this.globeRadiusMin;
        const h = Math.max(0, altitude);

        // Approximate horizon distance: sqrt(h² + 2*R*h)
        const horizonDistance = Math.sqrt(h * h + 2 * R * h);

        // Reduced horizon distance considering scale factor
        const reducedHorizonDist = horizonDistance * this.horizonScaleFactor;

        // Ensuring horizon distance is not less than the minimum far distance
        return Math.max(this.minFarDistance, reducedHorizonDist);
    }

    computeCameraNear(altitude) {
        const camToGroundDistMin = altitude - View.ALTITUDE_MAX;
        return Math.max(1, camToGroundDistMin * this.fovDepthFactor);
    }

    computeCameraFar() {
        // Three-geospatial aerial-perspective is not working well with a close camera far-plane.
        // Disabling dynamic camera far when realistic lighting is enabled
        // Tiles will, however, still be culled at this.horizonDistance if farFactor is less than 1
        if (this.horizonScaleFactor >= 1 || this.skyManager?.enabled) {
            // Setting far plane behind the globe
            return this.camera3D.position.length() + this.globeRadiusMin;
        }

        return this.horizonDistance;
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
     * @returns {Promise} a promise resolved with the new layer object when it is fully initialized or rejected if any error occurred.
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
     * Enable or disable shadow rendering.
     * Does not affect shadows cast by user-defined lights.
     * @type {boolean}
     */
    get shadows() {
        return this.sunLightLayer.castShadow;
    }

    set shadows(value) {
        if (this.sunLightLayer.castShadow == value) { return; }
        this.sunLightLayer.castShadow = value;
        this.notifyChange(this.camera3D);
    }
}

export default GlobeView;
