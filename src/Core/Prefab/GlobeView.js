import * as THREE from 'three';

import View, { VIEW_EVENTS } from '../View';
import { MAIN_LOOP_EVENTS } from '../MainLoop';
import { COLOR_LAYERS_ORDER_CHANGED } from '../../Renderer/ColorLayersOrdering';
import RendererConstant from '../../Renderer/RendererConstant';
import GlobeControls from '../../Renderer/ThreeExtended/GlobeControls';

import GlobeLayer from './Globe/GlobeLayer';
import Atmosphere from './Globe/Atmosphere';
import CoordStars from '../Geographic/CoordStars';

import Coordinates, { C, ellipsoidSizes } from '../Geographic/Coordinates';

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

export function createGlobeLayer(id, options = {}) {
    console.warn('createGlobeLayer is deprecated, use the GlobeLayer class instead.');
    return new GlobeLayer(id, options.object3d, options);
}

/**
 * Creates the viewer Globe (the globe of iTowns).
 * The first parameter is the coordinates on wich the globe will be centered at the initialization.
 * The second one is the HTML div in wich the scene will be created.
 * @constructor
 * @example view = new GlobeView(viewer, positionOnGlobe);
 * // positionOnGlobe in latitude, longitude and altitude
 * @augments View
 * @param {HTMLDivElement} viewerDiv - Where to instanciate the Three.js scene in the DOM
 * @param {object} coordCarto
 * @param {object=} options - see {@link View}
 */
function GlobeView(viewerDiv, coordCarto, options = {}) {
    THREE.Object3D.DefaultUp.set(0, 0, 1);
    const size = ellipsoidSizes().x;
    // Setup View
    View.call(this, 'EPSG:4978', viewerDiv, options);

    // Configure camera
    const positionCamera = new C.EPSG_4326(
        coordCarto.longitude,
        coordCarto.latitude,
        coordCarto.altitude);

    this.camera.camera3D.near = Math.max(15.0, 0.000002352 * size);
    this.camera.camera3D.far = size * 10;

    const tileLayer = new GlobeLayer('globe', options.object3d);

    const sun = new THREE.DirectionalLight();
    sun.position.set(-0.5, 0, 1);
    sun.updateMatrixWorld(true);
    tileLayer.object3d.add(sun);

    this.addLayer(tileLayer);

    // Atmosphere
    this.atmosphere = new Atmosphere();

    const atmosphereLayer = this.mainLoop.gfxEngine.getUniqueThreejsLayer();
    this.atmosphere.traverse((obj) => { obj.layers.set(atmosphereLayer); });
    this.camera.camera3D.layers.enable(atmosphereLayer);

    tileLayer.object3d.add(this.atmosphere);
    this.atmosphere.updateMatrixWorld(true);


    // Configure controls
    const positionTargetCamera = positionCamera.clone();
    positionTargetCamera.setAltitude(0);

    if (options.noControls) {
        this.camera.setPosition(positionCamera);
        this.camera.camera3D.lookAt(positionTargetCamera.as('EPSG:4978').xyz());
    } else {
        this.controls = new GlobeControls(this, positionTargetCamera, coordCarto.altitude, size);
        this.controls.handleCollision = typeof (options.handleCollision) !== 'undefined' ? options.handleCollision : true;
    }

    const mfogDistance = size * 160.0;
    this._renderState = RendererConstant.FINAL;
    this._fullSizeDepthBuffer = null;

    const renderer = this.mainLoop.gfxEngine.renderer;

    const coordCam = new Coordinates(this.referenceCrs, 0, 0, 0);
    const coordGeoCam = new C.EPSG_4326();
    const skyBaseColor = new THREE.Color(0x93d5f8);
    const colorSky = new THREE.Color();
    const spaceColor = new THREE.Color(0x030508);
    const limitAlti = 600000;

    this.addFrameRequester(MAIN_LOOP_EVENTS.BEFORE_RENDER, () => {
        if (this._fullSizeDepthBuffer != null) {
            // clean depth buffer
            this._fullSizeDepthBuffer = null;
        }
    });

    this.addFrameRequester(MAIN_LOOP_EVENTS.AFTER_CAMERA_UPDATE, () => {
        const v = new THREE.Vector3();
        v.setFromMatrixPosition(tileLayer.object3d.matrixWorld);
        var len = v.distanceTo(this.camera.camera3D.position);
        v.setFromMatrixScale(tileLayer.object3d.matrixWorld);

        // Compute fog distance, this function makes it possible to have a shorter distance
        // when the camera approaches the ground
        this.fogDistance = mfogDistance * Math.pow((len - size * 0.99) * 0.25 / size, 1.5);

        // get altitude camera
        coordCam.set(this.referenceCrs, this.camera.camera3D.position).as('EPSG:4326', coordGeoCam);
        const altitude = coordGeoCam.altitude();

        // If the camera altitude is below limitAlti,
        // we interpolate between the sky color and the space color
        if (altitude < limitAlti) {
            const t = (limitAlti - altitude) / limitAlti;
            colorSky.copy(spaceColor).lerp(skyBaseColor, t);
            renderer.setClearColor(colorSky, renderer.getClearAlpha());
        } else {
            renderer.setClearColor(spaceColor, renderer.getClearAlpha());
        }
    });

    this.tileLayer = tileLayer;

    const fn = () => {
        this.removeEventListener(VIEW_EVENTS.LAYERS_INITIALIZED, fn);
        this.dispatchEvent({ type: GLOBE_VIEW_EVENTS.GLOBE_INITIALIZED });
    };

    this.addEventListener(VIEW_EVENTS.LAYERS_INITIALIZED, fn);
}

GlobeView.prototype = Object.create(View.prototype);
GlobeView.prototype.constructor = GlobeView;

GlobeView.prototype.addLayer = function addLayer(layer) {
    if (!layer) {
        return new Promise((resolve, reject) => reject(new Error('layer is undefined')));
    }
    if (layer.type == 'color') {
        const colorLayerCount = this.getLayers(l => l.type === 'color').length;
        layer.sequence = colorLayerCount;
    } else if (layer.type == 'elevation') {
        if (layer.source.protocol === 'wmts' && layer.source.tileMatrixSet !== 'WGS84G') {
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
GlobeView.prototype.removeLayer = function removeImageryLayer(layerId) {
    const layer = this.getLayers(l => l.id === layerId)[0];
    if (layer && layer.type === 'color' && this.tileLayer.detach(layer)) {
        var cO = function cO(object) {
            if (object.removeColorLayer) {
                object.removeColorLayer(layerId);
            }
        };

        for (const root of this.tileLayer.level0Nodes) {
            root.traverse(cO);
        }
        const imageryLayers = this.getLayers(l => l.type === 'color');
        for (const color of imageryLayers) {
            if (color.sequence > layer.sequence) {
                color.sequence--;
            }
        }

        this.notifyChange(this.tileLayer);
        this.dispatchEvent({
            type: GLOBE_VIEW_EVENTS.LAYER_REMOVED,
            layerId,
        });

        return true;
    } else {
        throw new Error(`${layerId} isn't color layer`);
    }
};

GlobeView.prototype.selectNodeAt = function selectNodeAt(mouse) {
    const picked = this.tileLayer.pickObjectsAt(this, mouse);
    const selectedId = picked.length ? picked[0].object.id : undefined;

    for (const n of this.tileLayer.level0Nodes) {
        n.traverse((node) => {
            // only take of selectable nodes
            if (node.setSelected) {
                node.setSelected(node.id === selectedId);

                if (node.id === selectedId) {
                    // eslint-disable-next-line no-console
                    console.info(node);
                }
            }
        });
    }

    this.notifyChange();
};

GlobeView.prototype.setRealisticLightingOn = function setRealisticLightingOn(value) {
    const coSun = CoordStars.getSunPositionInScene(new Date().getTime(), 48.85, 2.35).normalize();

    this.lightingPos = coSun.normalize();

    const lighting = this.tileLayer.lighting;
    lighting.enable = value;
    lighting.position = coSun;

    this.atmosphere.setRealisticOn(value);
    this.atmosphere.updateLightingPos(coSun);

    this.updateMaterialUniform('lightingEnabled', value);
    this.updateMaterialUniform('lightPosition', coSun);
    this.notifyChange(this.tileLayer);
};

GlobeView.prototype.setLightingPos = function setLightingPos(pos) {
    const lightingPos = pos || CoordStars.getSunPositionInScene(this.ellipsoid, new Date().getTime(), 48.85, 2.35);

    this.updateMaterialUniform('lightPosition', lightingPos.clone().normalize());
    this.notifyChange(this.tileLayer);
};

GlobeView.prototype.updateMaterialUniform = function updateMaterialUniform(uniformName, value) {
    for (const n of this.tileLayer.level0Nodes) {
        n.traverse((obj) => {
            if (!obj.material || !obj.material.uniforms) {
                return;
            }
            if (uniformName in obj.material.uniforms) {
                obj.material.uniforms[uniformName].value = value;
            }
        });
    }
};

export default GlobeView;
