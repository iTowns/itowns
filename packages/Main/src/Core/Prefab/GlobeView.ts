import * as THREE from 'three';

import View, { VIEW_EVENTS } from 'Core/View';
import type { ViewOptions } from 'Core/View';
import GlobeControls from 'Controls/GlobeControls';
import { Coordinates, ellipsoidSizes, Extent } from '@itowns/geographic';
import GlobeLayer, { type GlobeLayerOptions } from 'Core/Prefab/Globe/GlobeLayer';
import CameraUtils from 'Utils/CameraUtils';
import type { CameraTransformOptions } from 'Utils/CameraUtils';
import WebXR from 'Renderer/WebXR';
import type PlanarLayer from './Planar/PlanarLayer';
import RealisticLightingManager, {
    type RealisticLightingOptions,
} from './Globe/RealisticLightingManager';

/**
 * Globe events.
 *
 * Deprecated aliases:
 * - GLOBE_INITIALIZED: use VIEW_EVENTS.INITIALIZED.
 * - LAYER_ADDED: use VIEW_EVENTS.LAYER_ADDED.
 * - LAYER_REMOVED: use VIEW_EVENTS.LAYER_REMOVED.
 * - COLOR_LAYERS_ORDER_CHANGED:
 *   use VIEW_EVENTS.COLOR_LAYERS_ORDER_CHANGED.
 */
export const GLOBE_VIEW_EVENTS = {
    /**
     * Fires when the view is completely loaded. Controls and view's functions
     * can be called then.
     *
     * Event name: `GlobeView#initialized`
     * Payload: `{ target, type: 'initialized' }`
     */
    GLOBE_INITIALIZED: VIEW_EVENTS.INITIALIZED,
    /**
     * Fires when a layer is added.
     *
     * Event name: `GlobeView#layer-added`
     * Payload: `{ layerId, target, type: 'layers-added' }`
     */
    LAYER_ADDED: VIEW_EVENTS.LAYER_ADDED,
    /**
     * Fires when a layer is removed.
     *
     * Event name: `GlobeView#layer-removed`
     * Payload: `{ layerId, target, type: 'layers-added' }`
     */
    LAYER_REMOVED: VIEW_EVENTS.LAYER_REMOVED,
    /**
     * Fires when the layers order has changed.
     *
     * Event name: `GlobeView#layers-order-changed`
     * Payload:
     * ```ts
     * {
     *     new: { sequence: number[] },
     *     previous: { sequence: number[] },
     *     target,
     *     type: 'layers-order-changed',
     * }
     * ```
     */
    COLOR_LAYERS_ORDER_CHANGED: VIEW_EVENTS.COLOR_LAYERS_ORDER_CHANGED,
};

type GlobeViewOptions = ViewOptions & GlobeLayerOptions & {
    /** See options of {@link GlobeControls} */
    controls: object,
    /** WebXR configuration - its presence alone
     * enable WebXR to switch on VR visualization. */
    webXR: {
        /** WebXR rendering callback. */
        callback: () => void,
        /** Enable the webXR controllers handling. */
        controllers: boolean,
    }
    /** The camera's near and far are automatically adjusted. */
    dynamicCameraNearFar: boolean,
    /** Tweak realistic lighting. */
    realisticLightingOptions: RealisticLightingOptions,
    /** Controls how far the camera can see.
     * The maximum view distance is this factor times the camera's altitude
     * (above sea level). */
    farFactor: number,
    /** Proportion of the visible depth range that contains fog.
     * Between 0 and 1. (optional) */
    fogSpread: number,
    object3d: THREE.Object3D,
    noControls: boolean,
    /** Handle collision between camera and ground or not, i.e. whether
     * you can zoom underground or not. Default is true. */
    handleCollision: boolean,
}


class GlobeView extends View {
    isGlobeView = true as const;
    farFactor: number;
    fogSpread: number;
    webXR?: WebXR;
    date: Date;
    realisticLightingManager: RealisticLightingManager;

    /**
     * Creates a view of a globe.
     *
     * @example <caption><b>Instance GlobeView.</b></caption>
        * ```ts
        * const viewerDiv = document.getElementById('viewerDiv');
        * const placement = {
        *     coord: new itowns.Coordinates('EPSG:4326', 2.351323, 48.856712),
        *     range: 25000000,
        * };
        * const view = new itowns.GlobeView(viewerDiv, placement);
        * ```
     *
        * @param viewerDiv - Where to attach the view and
     * display it in the DOM.
        * @param placement - An object to place
     * view
        * @param options - See options of {@link View}.
     */
    constructor(
        viewerDiv: HTMLDivElement,
        placement: CameraTransformOptions | Extent = {},
        options: Partial<GlobeViewOptions> = {},
    ) {
        THREE.Object3D.DEFAULT_UP.set(0, 0, 1);
        // Setup View
        super('EPSG:4978', viewerDiv, options);
        this.isGlobeView = true;

        this.camera3D.near = Math.max(15.0, 0.000002352 * ellipsoidSizes.x);
        this.camera3D.far = ellipsoidSizes.x * 10;
        const tileLayer = new GlobeLayer('globe', options.object3d, options);
        this.mainLoop.gfxEngine.label2dRenderer.infoTileLayer = tileLayer.info;

        this.addLayer(tileLayer);
        this.tileLayer = tileLayer;

        if (!('isExtent' in placement)) {
            placement.coord = placement.coord || new Coordinates('EPSG:4326', 0, 0);
            placement.tilt = placement.tilt || 89.5;
            placement.heading = placement.heading || 0;
            placement.range = placement.range || ellipsoidSizes.x * 2.0;
        }

        this.farFactor = options.farFactor ?? 40;
        this.fogSpread = options.fogSpread ?? 0.5;

        if (options.noControls) {
            CameraUtils.transformCameraToLookAtTarget(this, this.camera3D, placement);

            // In this case, since the camera's near and far properties aren't
            // dynamically computed, the default fog won't be adapted,
            // so don't enable it
        } else {
            this.controls = new GlobeControls(this, placement, options.controls);
            this.controls.handleCollision =
                typeof (options.handleCollision) !== 'undefined' ?
                    options.handleCollision : true;

            const globeRadiusMin = Math.min(ellipsoidSizes.x, ellipsoidSizes.y, ellipsoidSizes.z);

            if (options.dynamicCameraNearFar || options.dynamicCameraNearFar === undefined) {
                this.addEventListener(VIEW_EVENTS.CAMERA_MOVED, () => {
                    // update camera's near and far
                    const originToCamSq = this.camera3D.position.lengthSq();

                    // maximum possible distance from ground to camera
                    const camCoordinates = new Coordinates(this.referenceCrs)
                        .setFromVector3(this.camera3D.position);
                    camCoordinates.as(this.tileLayer.extent.crs, camCoordinates);
                    const camToSeaLevel = camCoordinates.z;

                    const camToGroundDistMin = camToSeaLevel - View.ALTITUDE_MAX;
                    this.camera3D.near = Math.max(1, camToGroundDistMin * this.fovDepthFactor);

                    // distance from camera to the horizon
                    const horizonDist = Math.sqrt(
                        Math.max(0, originToCamSq - globeRadiusMin * globeRadiusMin));

                    this.camera3D.far = Math.min(this.farFactor * camToSeaLevel, horizonDist);
                    this.camera3D.updateProjectionMatrix();

                    const fog = this.realisticLightingManager.fog;
                    if (!fog) { return; }
                    fog.far = this.camera3D.far;
                    fog.near = fog.far - this.fogSpread * (fog.far - this.camera3D.near);
                });
            }
        }

        // GlobeView needs this.camera.resize to set perpsective matrix camera
        this.camera.resize(viewerDiv.clientWidth, viewerDiv.clientHeight);

        if (options.webXR) {
            this.webXR = new WebXR(this, typeof options.webXR === 'boolean' ? {} : options.webXR);
            this.webXR.initializeWebXR();
        }

        this.date = new Date(); // now

        this.scene.fog = new THREE.Fog(0xe2edff, 1, 1000); // default fog

        this.realisticLightingManager =
            new RealisticLightingManager(this, options.realisticLightingOptions);
    }

    /**
     * Add layer in viewer.
     * The layer id must be unique.
     *
     * The `layer.whenReady` is a promise that resolves when
     * the layer is done. This promise is also returned by
     * `addLayer` allowing to chain call.
     *
    * The layer added is attached, by default to `GlobeLayer`
    * (`GlobeView.tileLayer`).
     * If you want add a unattached layer use `View#addLayer` parent method.
     *
    * @param layer - The layer to add in view.
    * @returns A promise resolved with the new layer object when it is
    * fully initialized or rejected if any error occurred.
    * TODO: fix promise return type
     */
    addLayer(layer: PlanarLayer | GlobeLayer): Promise<Error> | void {
        if (!layer || !layer.isLayer) {
            return Promise.reject(new Error('Add Layer type object'));
        }
        if ('isColorLayer' in layer) {
            if (!this.tileLayer.tileMatrixSets.includes(layer.source.crs)) {
                return layer._reject(`Only ${this.tileLayer.tileMatrixSets} ` +
                    'tileMatrixSet are currently supported for color layers');
            }
        } else if ('isElevationLayer' in layer) {
            if (layer.source.crs !== this.tileLayer.tileMatrixSets[0]) {
                return layer._reject(`Only ${this.tileLayer.tileMatrixSets[0]} ` +
                    'tileMatrixSet is currently supported for elevation layers');
            }
        }

        return super.addLayer(layer, this.tileLayer);
    }

    getPixelsToDegrees(pixels = 1, screenCoord: THREE.Vector2 | undefined) {
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
