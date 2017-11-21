import * as THREE from 'three';

import View from '../View';
import { RENDERING_PAUSED } from '../MainLoop';
import { COLOR_LAYERS_ORDER_CHANGED } from '../../Renderer/ColorLayersOrdering';
import RendererConstant from '../../Renderer/RendererConstant';
import GlobeControls from '../../Renderer/ThreeExtended/GlobeControls';
import { unpack1K } from '../../Renderer/LayeredMaterial';

import Atmosphere from './Globe/Atmosphere';
import CoordStars from '../Geographic/CoordStars';

import { C, ellipsoidSizes } from '../Geographic/Coordinates';
import { createGlobe } from '../DefaultGeometryLayers';
import { GeometryLayer } from '../Layer/Layer';
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

    this.camera.setPosition(positionCamera);
    this.camera.camera3D.lookAt({ x: 0, y: 0, z: 0 });
    this.camera.camera3D.near = Math.max(15.0, 0.000002352 * size);
    this.camera.camera3D.far = size * 10;
    this.camera.camera3D.updateProjectionMatrix();
    this.camera.camera3D.updateMatrixWorld(true);

    const wgs84TileLayer = createGlobe('globe', options);

    const sun = new THREE.DirectionalLight();
    sun.position.set(-0.5, 0, 1);
    sun.updateMatrixWorld(true);
    wgs84TileLayer.object3d.add(sun);

    this.addLayer(wgs84TileLayer);

    // Atmosphere
    this.atmosphere = new Atmosphere();

    const atmosphereLayer = this.mainLoop.gfxEngine.getUniqueThreejsLayer();
    this.atmosphere.traverse((obj) => { obj.layers.set(atmosphereLayer); });
    this.camera.camera3D.layers.enable(atmosphereLayer);

    wgs84TileLayer.object3d.add(this.atmosphere);
    this.atmosphere.updateMatrixWorld(true);


    // Configure controls
    const positionTargetCamera = positionCamera.clone();
    positionTargetCamera.setAltitude(0);

    if (options.noControls) {
        this.camera.camera3D.lookAt(positionTargetCamera.as('EPSG:4978').xyz());
    } else {
        this.controls = new GlobeControls(this, positionTargetCamera.as('EPSG:4978').xyz(), size);
        this.controls.handleCollision = typeof (options.handleCollision) !== 'undefined' ? options.handleCollision : true;
    }

    const mfogDistance = size * 160.0;
    this._renderState = RendererConstant.FINAL;
    this._fullSizeDepthBuffer = null;

    const renderer = this.mainLoop.gfxEngine.renderer;
    this.preRender = () => {
        // WARNING, if the prerender is re-defined by the user,
        // These mechanisms no longer work
        // TODO: need to fix it
        if (this._fullSizeDepthBuffer != null) {
            // clean depth buffer
            this._fullSizeDepthBuffer = null;
        }
        const v = new THREE.Vector3();
        v.setFromMatrixPosition(wgs84TileLayer.object3d.matrixWorld);
        var len = v.distanceTo(this.camera.camera3D.position);
        v.setFromMatrixScale(wgs84TileLayer.object3d.matrixWorld);
        var lim = v.x * size * 1.1;

        // TODO: may be move in camera update
        // Compute fog distance, this function makes it possible to have a shorter distance
        // when the camera approaches the ground
        this.fogDistance = mfogDistance * Math.pow((len - size * 0.99) * 0.25 / size, 1.5);

        if (len < lim) {
            var t = Math.pow(Math.cos((lim - len) / (lim - v.x * size * 0.9981) * Math.PI * 0.5), 1.5);
            var color = new THREE.Color(0x93d5f8);
            renderer.setClearColor(color.multiplyScalar(1.0 - t), renderer.getClearAlpha());
        } else if (len >= lim) {
            renderer.setClearColor(0x030508, renderer.getClearAlpha());
        }
    };

    this.baseLayer = wgs84TileLayer;

    const fn = () => {
        this.mainLoop.removeEventListener('command-queue-empty', fn);
        this.dispatchEvent({ type: GLOBE_VIEW_EVENTS.GLOBE_INITIALIZED });
    };

    this.mainLoop.addEventListener('command-queue-empty', fn);

    this.notifyChange(true);
}

GlobeView.prototype = Object.create(View.prototype);
GlobeView.prototype.constructor = GlobeView;

// Preprocess layer for a Globe if needed
GlobeView.prototype._preAddLayer = function _preAddLayer(layer) {
    this._deprecatedPreAddLayer(layer);

    if (layer.type == 'color') {
        if (layer.protocol === 'rasterizer') {
            layer.reprojection = 'EPSG:4326';
        }
    } else if (layer.type == 'elevation') {
        if (layer.protocol === 'wmts' && layer.options.tileMatrixSet !== 'WGS84G') {
            throw new Error('Only WGS84G tileMatrixSet is currently supported for WMTS elevation layers');
        }
    }
};

/**
 * Calls View.addLayer using this.baseLayer as the parent layer
 * @param {Layer} layer: layer to attach to the planar geometry
 * @deprecated
 * @return {Promise} see View.addLayer
 */
GlobeView.prototype.addLayer = function addLayer(layer) {
    if (layer instanceof GeometryLayer) {
        return View.prototype.addLayer.call(this, layer);
    }

    if (!this._warnAddLayerDeprecated) {
        // eslint-disable-next-line no-console
        console.warn('globeView.addLayer(colorLayer) has been deprecated.\n' +
            'Use globeView.baseLayer.[addColorLayer|addElevationLayer|addFeatureLayer](layer) instead.');
        this._warnAddLayerDeprecated = true;
    }
    const result = View.prototype.addLayer.call(this, layer, this.baseLayer);
    this.dispatchEvent({
        type: GLOBE_VIEW_EVENTS.LAYER_ADDED,
        layerId: layer.id,
    });
    return result;
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
    if (layer && layer.type === 'color') {
        this.baseLayer.removeColorLayer(layer);
        this.notifyChange(true);
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
    // update the picking ray with the camera and mouse position
    const selectedId = this.screenCoordsToNodeId(mouse);

    for (const n of this.baseLayer.level0Nodes) {
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

    this.notifyChange(true);
};

GlobeView.prototype.screenCoordsToNodeId = function screenCoordsToNodeId(mouse) {
    const dim = this.mainLoop.gfxEngine.getWindowSize();

    mouse = mouse || new THREE.Vector2(Math.floor(dim.x / 2), Math.floor(dim.y / 2));

    const previousRenderState = this._renderState;
    this.changeRenderState(RendererConstant.ID);

    // Prepare state
    const prev = this.camera.camera3D.layers.mask;
    this.camera.camera3D.layers.mask = 1 << this.baseLayer.threejsLayer;

    var buffer = this.mainLoop.gfxEngine.renderViewTobuffer(
        this,
        this.mainLoop.gfxEngine.fullSizeRenderTarget,
        mouse.x, dim.y - mouse.y,
        1, 1);

    this.changeRenderState(previousRenderState);
    this.camera.camera3D.layers.mask = prev;

    var depthRGBA = new THREE.Vector4().fromArray(buffer).divideScalar(255.0);

    // unpack RGBA to float
    var unpack = unpack1K(depthRGBA, Math.pow(256, 3));

    return Math.round(unpack);
};

GlobeView.prototype.readDepthBuffer = function readDepthBuffer(x, y, width, height) {
    const g = this.mainLoop.gfxEngine;
    const previousRenderState = this._renderState;
    this.changeRenderState(RendererConstant.DEPTH);
    const buffer = g.renderViewTobuffer(this, g.fullSizeRenderTarget, x, y, width, height);
    this.changeRenderState(previousRenderState);
    return buffer;
};

const matrix = new THREE.Matrix4();
const screen = new THREE.Vector2();
const pickWorldPosition = new THREE.Vector3();
const ray = new THREE.Ray();
const direction = new THREE.Vector3();
GlobeView.prototype.getPickingPositionFromDepth = function getPickingPositionFromDepth(mouse) {
    const l = this.mainLoop;
    const viewPaused = l.scheduler.commandsWaitingExecutionCount() == 0 && l.renderingState == RENDERING_PAUSED;
    const g = l.gfxEngine;
    const dim = g.getWindowSize();
    const camera = this.camera.camera3D;

    mouse = mouse || dim.clone().multiplyScalar(0.5);
    mouse.x = Math.floor(mouse.x);
    mouse.y = Math.floor(mouse.y);

    const prev = camera.layers.mask;
    camera.layers.mask = 1 << this.baseLayer.threejsLayer;

    // Render/Read to buffer
    let buffer;
    if (viewPaused) {
        this._fullSizeDepthBuffer = this._fullSizeDepthBuffer || this.readDepthBuffer(0, 0, dim.x, dim.y);
        const id = ((dim.y - mouse.y - 1) * dim.x + mouse.x) * 4;
        buffer = this._fullSizeDepthBuffer.slice(id, id + 4);
    } else {
        buffer = this.readDepthBuffer(mouse.x, dim.y - mouse.y - 1, 1, 1);
    }

    screen.x = (mouse.x / dim.x) * 2 - 1;
    screen.y = -(mouse.y / dim.y) * 2 + 1;

    // Origin
    ray.origin.copy(camera.position);

    // Direction
    ray.direction.set(screen.x, screen.y, 0.5);
    // Unproject
    matrix.multiplyMatrices(camera.matrixWorld, matrix.getInverse(camera.projectionMatrix));
    ray.direction.applyMatrix4(matrix);
    ray.direction.sub(ray.origin);

    direction.set(0, 0, 1.0);
    direction.applyMatrix4(matrix);
    direction.sub(ray.origin);

    const angle = direction.angleTo(ray.direction);
    const orthoZ = g.depthBufferRGBAValueToOrthoZ(buffer, camera);
    const length = orthoZ / Math.cos(angle);

    pickWorldPosition.addVectors(camera.position, ray.direction.setLength(length));

    camera.layers.mask = prev;

    if (pickWorldPosition.length() > 10000000)
        { return undefined; }

    return pickWorldPosition;
};

GlobeView.prototype.changeRenderState = function changeRenderState(newRenderState) {
    if (this._renderState == newRenderState || !this.baseLayer.level0Nodes) {
        return;
    }

    // build traverse function
    var changeStateFunction = (function getChangeStateFunctionFn() {
        return function changeStateFunction(object3D) {
            if (object3D.changeState) {
                object3D.changeState(newRenderState);
            }
        };
    }());

    for (const n of this.baseLayer.level0Nodes) {
        n.traverseVisible(changeStateFunction);
    }
    this._renderState = newRenderState;
};

GlobeView.prototype.setRealisticLightingOn = function setRealisticLightingOn(value) {
    const coSun = CoordStars.getSunPositionInScene(new Date().getTime(), 48.85, 2.35).normalize();

    this.lightingPos = coSun.normalize();

    const lighting = this.baseLayer.lighting;
    lighting.enable = value;
    lighting.position = coSun;

    this.atmosphere.setRealisticOn(value);
    this.atmosphere.updateLightingPos(coSun);

    this.updateMaterialUniform('lightingEnabled', value);
    this.updateMaterialUniform('lightPosition', coSun);
    this.notifyChange(true);
};

GlobeView.prototype.setLightingPos = function setLightingPos(pos) {
    const lightingPos = pos || CoordStars.getSunPositionInScene(this.ellipsoid, new Date().getTime(), 48.85, 2.35);

    this.updateMaterialUniform('lightPosition', lightingPos.clone().normalize());
    this.notifyChange(true);
};

GlobeView.prototype.updateMaterialUniform = function updateMaterialUniform(uniformName, value) {
    for (const n of this.baseLayer.level0Nodes) {
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
