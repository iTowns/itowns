import * as THREE from 'three';

import View, { VIEW_EVENTS } from '../View';
import { RENDERING_PAUSED, MAIN_LOOP_EVENTS } from '../MainLoop';
import { COLOR_LAYERS_ORDER_CHANGED } from '../../Renderer/ColorLayersOrdering';
import RendererConstant from '../../Renderer/RendererConstant';
import GlobeControls from '../../Renderer/ThreeExtended/GlobeControls';

import { GeometryLayer } from '../Layer/Layer';

import Atmosphere from './Globe/Atmosphere';
import CoordStars from '../Geographic/CoordStars';

import Coordinates, { C, ellipsoidSizes } from '../Geographic/Coordinates';
import { processTiledGeometryNode } from '../../Process/TiledNodeProcessing';
import { updateLayeredMaterialNodeImagery, updateLayeredMaterialNodeElevation } from '../../Process/LayeredMaterialNodeProcessing';
import { globeCulling, preGlobeUpdate, globeSubdivisionControl, globeSchemeTileWMTS, globeSchemeTile1 } from '../../Process/GlobeTileProcessing';
import BuilderEllipsoidTile from './Globe/BuilderEllipsoidTile';
import SubdivisionControl from '../../Process/SubdivisionControl';
import Picking from '../Picking';

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

export function createGlobeLayer(id, options) {
    // Configure tiles
    const nodeInitFn = function nodeInitFn(layer, parent, node) {
        node.material.setLightingOn(layer.lighting.enable);
        node.material.uniforms.lightPosition.value = layer.lighting.position;
        if (layer.noTextureColor) {
            node.material.uniforms.noTextureColor.value.copy(layer.noTextureColor);
        }

        if (__DEBUG__) {
            node.material.uniforms.showOutline = { value: layer.showOutline || false };
            node.material.wireframe = layer.wireframe || false;
        }
    };

    function _commonAncestorLookup(a, b) {
        if (!a || !b) {
            return undefined;
        }
        if (a.level == b.level) {
            if (a.id == b.id) {
                return a;
            } else if (a.level != 0) {
                return _commonAncestorLookup(a.parent, b.parent);
            } else {
                return undefined;
            }
        } else if (a.level < b.level) {
            return _commonAncestorLookup(a, b.parent);
        } else {
            return _commonAncestorLookup(a.parent, b);
        }
    }

    const wgs84TileLayer = new GeometryLayer(id, options.object3d || new THREE.Group());
    wgs84TileLayer.schemeTile = globeSchemeTileWMTS(globeSchemeTile1);
    wgs84TileLayer.extent = wgs84TileLayer.schemeTile[0].clone();
    for (let i = 1; i < wgs84TileLayer.schemeTile.length; i++) {
        wgs84TileLayer.extent.union(wgs84TileLayer.schemeTile[i]);
    }
    wgs84TileLayer.preUpdate = (context, layer, changeSources) => {
        SubdivisionControl.preUpdate(context, layer);

        if (__DEBUG__) {
            layer._latestUpdateStartingLevel = 0;
        }

        preGlobeUpdate(context, layer);
        if (changeSources.has(undefined) || changeSources.size == 0) {
            return layer.level0Nodes;
        }
        let commonAncestor;
        for (const source of changeSources.values()) {
            if (source.isCamera) {
                // if the change is caused by a camera move, no need to bother
                // to find common ancestor: we need to update the whole tree:
                // some invisible tiles may now be visible
                return layer.level0Nodes;
            }
            if (source.layer === layer.id) {
                if (!commonAncestor) {
                    commonAncestor = source;
                } else {
                    commonAncestor = _commonAncestorLookup(commonAncestor, source);
                    if (!commonAncestor) {
                        return layer.level0Nodes;
                    }
                }
                if (commonAncestor.material == null) {
                    commonAncestor = undefined;
                }
            }
        }
        if (commonAncestor) {
            if (__DEBUG__) {
                layer._latestUpdateStartingLevel = commonAncestor.level;
            }
            return [commonAncestor];
        } else {
            return layer.level0Nodes;
        }
    };

    function subdivision(context, layer, node) {
        if (SubdivisionControl.hasEnoughTexturesToSubdivide(context, layer, node)) {
            return globeSubdivisionControl(2,
                options.maxSubdivisionLevel || 18,
                options.sseSubdivisionThreshold || 1.0,
                options.maxDeltaElevationLevel || 4)(context, layer, node);
        }
        return false;
    }

    wgs84TileLayer.update = processTiledGeometryNode(globeCulling(2), subdivision);
    wgs84TileLayer.builder = new BuilderEllipsoidTile();
    wgs84TileLayer.onTileCreated = nodeInitFn;
    wgs84TileLayer.type = 'geometry';
    wgs84TileLayer.protocol = 'tile';
    wgs84TileLayer.visible = true;
    wgs84TileLayer.lighting = {
        enable: false,
        position: { x: -0.5, y: 0.0, z: 1.0 },
    };
    // provide custom pick function
    wgs84TileLayer.pickObjectsAt = (_view, mouse) => Picking.pickTilesAt(_view, mouse, wgs84TileLayer);

    return wgs84TileLayer;
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

    this.camera.setPosition(positionCamera);
    this.camera.camera3D.lookAt({ x: 0, y: 0, z: 0 });
    this.camera.camera3D.near = Math.max(15.0, 0.000002352 * size);
    this.camera.camera3D.far = size * 10;
    this.camera.camera3D.updateProjectionMatrix();
    this.camera.camera3D.updateMatrixWorld(true);

    const wgs84TileLayer = createGlobeLayer('globe', options);

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
        const v = new THREE.Vector3();
        v.setFromMatrixPosition(wgs84TileLayer.object3d.matrixWorld);
        var len = v.distanceTo(this.camera.camera3D.position);
        v.setFromMatrixScale(wgs84TileLayer.object3d.matrixWorld);

        // TODO: may be move in camera update
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

    this.wgs84TileLayer = wgs84TileLayer;

    const fn = () => {
        this.mainLoop.removeEventListener(VIEW_EVENTS.LAYERS_INITIALIZED, fn);
        this.dispatchEvent({ type: GLOBE_VIEW_EVENTS.GLOBE_INITIALIZED });
    };

    this.addEventListener(VIEW_EVENTS.LAYERS_INITIALIZED, fn);

    this.notifyChange(true);
}

GlobeView.prototype = Object.create(View.prototype);
GlobeView.prototype.constructor = GlobeView;

GlobeView.prototype.addLayer = function addLayer(layer) {
    if (layer.type == 'color') {
        const colorLayerCount = this.getLayers(l => l.type === 'color').length;
        layer.sequence = colorLayerCount;
        layer.update = updateLayeredMaterialNodeImagery;
    } else if (layer.type == 'elevation') {
        if (layer.protocol === 'wmts' && layer.options.tileMatrixSet !== 'WGS84G') {
            throw new Error('Only WGS84G tileMatrixSet is currently supported for WMTS elevation layers');
        }
        layer.update = updateLayeredMaterialNodeElevation;
    }
    const layerId = layer.id;
    const layerPromise = View.prototype.addLayer.call(this, layer, this.wgs84TileLayer);

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
    if (layer && layer.type === 'color' && this.wgs84TileLayer.detach(layer)) {
        var cO = function cO(object) {
            if (object.removeColorLayer) {
                object.removeColorLayer(layerId);
            }
        };

        for (const root of this.wgs84TileLayer.level0Nodes) {
            root.traverse(cO);
        }
        const imageryLayers = this.getLayers(l => l.type === 'color');
        for (const color of imageryLayers) {
            if (color.sequence > layer.sequence) {
                color.sequence--;
            }
        }

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
    const picked = this.wgs84TileLayer.pickObjectsAt(this, mouse);
    const selectedId = picked.length ? picked[0].object.id : undefined;

    for (const n of this.wgs84TileLayer.level0Nodes) {
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

GlobeView.prototype.readDepthBuffer = function readDepthBuffer(x, y, width, height) {
    const g = this.mainLoop.gfxEngine;
    const restore = this.wgs84TileLayer.level0Nodes.map(n => n.pushRenderState(RendererConstant.DEPTH));
    const buffer = g.renderViewToBuffer(this, { x, y, width, height });
    restore.forEach(r => r());

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
    camera.layers.mask = 1 << this.wgs84TileLayer.threejsLayer;

    // Render/Read to buffer
    let buffer;
    if (viewPaused) {
        this._fullSizeDepthBuffer = this._fullSizeDepthBuffer || this.readDepthBuffer(0, 0, dim.x, dim.y);
        const id = ((dim.y - mouse.y - 1) * dim.x + mouse.x) * 4;
        buffer = this._fullSizeDepthBuffer.slice(id, id + 4);
    } else {
        buffer = this.readDepthBuffer(mouse.x, mouse.y, 1, 1);
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

GlobeView.prototype.setRealisticLightingOn = function setRealisticLightingOn(value) {
    const coSun = CoordStars.getSunPositionInScene(new Date().getTime(), 48.85, 2.35).normalize();

    this.lightingPos = coSun.normalize();

    const lighting = this.wgs84TileLayer.lighting;
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
    for (const n of this.wgs84TileLayer.level0Nodes) {
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
