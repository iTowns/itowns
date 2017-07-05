import * as THREE from 'three';

import View from '../View';
import RendererConstant from '../../Renderer/RendererConstant';
import GlobeControls from '../../Renderer/ThreeExtended/GlobeControls';
import { unpack1K } from '../../Renderer/LayeredMaterial';

import { GeometryLayer } from '../Layer/Layer';

import Atmosphere from './Globe/Atmosphere';
import CoordStars from '../Geographic/CoordStars';
import Clouds from './Globe/Clouds';

import { C, ellipsoidSizes } from '../Geographic/Coordinates';
import { processTiledGeometryNode, initTiledGeometryLayer } from '../../Process/TiledNodeProcessing';
import { updateLayeredMaterialNodeImagery, updateLayeredMaterialNodeElevation } from '../../Process/LayeredMaterialNodeProcessing';
import { globeCulling, preGlobeUpdate, globeSubdivisionControl, globeSchemeTileWMTS, globeSchemeTile1 } from '../../Process/GlobeTileProcessing';
import BuilderEllipsoidTile from './Globe/BuilderEllipsoidTile';

/**
 * Fires when the view is completely loaded. Controls and view's functions can be called then.
 * @event GlobeView#initialized
 * @property target {view} dispatched on view
 * @property type {string} initialized
 */

/**
 * Globe's EVENT
 * @property GLOBE_INITIALIZED {string} emit one time when globe is initialized
 */

export const GLOBE_VIEW_EVENTS = {
    GLOBE_INITIALIZED: 'initialized',
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
function GlobeView(viewerDiv, coordCarto, options) {
    THREE.Object3D.DefaultUp.set(0, 0, 1);
    const size = ellipsoidSizes().x;
    // Setup View
    View.call(this, 'EPSG:4978', viewerDiv, options);

    // Configure camera
    const positionCamera = new C.EPSG_4326(
        coordCarto.longitude,
        coordCarto.latitude,
        coordCarto.altitude);

    this.camera.setPosition(positionCamera.as('EPSG:4978').xyz());
    this.camera.camera3D.lookAt({ x: 0, y: 0, z: 0 });
    this.camera.camera3D.near = Math.max(15.0, 0.000002352 * size);
    this.camera.camera3D.far = size * 10;
    this.camera.camera3D.updateProjectionMatrix();
    this.camera.camera3D.updateMatrixWorld(true);


    // Configure tiles
    const nodeInitFn = function nodeInitFn(context, layer, parent, node) {
        node.material.setLightingOn(layer.lighting.enable);
        node.material.uniforms.lightPosition.value = layer.lighting.position;

        if (__DEBUG__) {
            node.material.uniforms.showOutline = { value: layer.showOutline || false };
            node.material.wireframe = layer.wireframe || false;
        }
    };
    const SSE_SUBDIVISION_THRESHOLD = 1.0;

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

    const wgs84TileLayer = new GeometryLayer('globe');
    const initLayer = initTiledGeometryLayer(globeSchemeTileWMTS(globeSchemeTile1));
    wgs84TileLayer.preUpdate = (context, layer, changeSources) => {
        this._latestUpdateStartingLevel = 0;
        if (layer.level0Nodes === undefined) {
            initLayer(context, layer);
        }
        preGlobeUpdate(context);
        if (changeSources.has(undefined) || changeSources.size == 0) {
            return layer.level0Nodes;
        }
        let commonAncestor;
        for (const source of changeSources.values()) {
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
        if (commonAncestor) {
            this._latestUpdateStartingLevel = commonAncestor.level;
            return [commonAncestor];
        } else {
            return [];
        }
    };

    wgs84TileLayer.update =
        processTiledGeometryNode(
            globeCulling(2),
            globeSubdivisionControl(2, 17, SSE_SUBDIVISION_THRESHOLD),
            nodeInitFn);
    wgs84TileLayer.builder = new BuilderEllipsoidTile();

    wgs84TileLayer.type = 'geometry';
    wgs84TileLayer.protocol = 'tile';
    wgs84TileLayer.visible = true;
    wgs84TileLayer.lighting = {
        enable: false,
        position: { x: -0.5, y: 0.0, z: 1.0 },
    };

    const sun = new THREE.DirectionalLight();
    sun.position.set(-0.5, 0, 1);
    sun.updateMatrixWorld(true);
    this.scene.add(sun);

    this.addLayer(wgs84TileLayer);

    // Atmosphere
    this.atmosphere = new Atmosphere();
    this.clouds = new Clouds();
    this.atmosphere.add(this.clouds);

    const atmosphereLayer = this.mainLoop.gfxEngine.getUniqueThreejsLayer();
    this.atmosphere.traverse((obj) => { obj.layers.set(atmosphereLayer); });
    this.camera.camera3D.layers.enable(atmosphereLayer);

    this.scene.add(this.atmosphere);


    // Configure controls
    const positionTargetCamera = positionCamera.clone();
    positionTargetCamera.setAltitude(0);

    this.controls = new GlobeControls(
        this,
        positionTargetCamera.as('EPSG:4978').xyz(),
        this.mainLoop.gfxEngine.renderer.domElement,
        viewerDiv,
        size,
        this.getPickingPositionFromDepth.bind(this));
    this.controls.rotateSpeed = 0.25;
    this.controls.zoomSpeed = 2.0;
    this.controls.minDistance = 30;
    this.controls.maxDistance = size * 8.0;

    this.controls.addEventListener('change', () => {
        this.camera.update();
        this.notifyChange(true);
    });

    this.controls.addEventListener('selectClick', (event) => {
        this.selectNodeAt(event.mouse);
    }, false);

    this._renderState = RendererConstant.FINAL;

    this.preRender = () => {
        var len = this.camera.position().length();
        var lim = size * 1.1;

        if (len < lim) {
            var t = Math.pow(Math.cos((lim - len) / (lim - size * 0.9981) * Math.PI * 0.5), 1.5);
            var color = new THREE.Color(0x93d5f8);
            this.mainLoop.gfxEngine.renderer.setClearColor(color.multiplyScalar(1.0 - t));
        } else if (len >= lim) {
            this.mainLoop.gfxEngine.renderer.setClearColor(0x030508);
        }
    };

    this.wgs84TileLayer = wgs84TileLayer;

    const fn = () => {
        this.mainLoop.removeEventListener('command-queue-empty', fn);
        this.dispatchEvent({ type: GLOBE_VIEW_EVENTS.GLOBE_INITIALIZED });
    };

    this.mainLoop.addEventListener('command-queue-empty', fn);

    window.addEventListener('resize', () => {
        this.controls.updateCamera(this.camera, this.viewerDiv.clientWidth, this.viewerDiv.clientHeight);
    }, false);

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
    return View.prototype.addLayer.call(this, layer, this.wgs84TileLayer);
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
    const selectedId = this.screenCoordsToNodeId(mouse);

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

GlobeView.prototype.screenCoordsToNodeId = function screenCoordsToNodeId(mouse) {
    const dim = this.mainLoop.gfxEngine.getWindowSize();

    mouse = mouse || new THREE.Vector2(Math.floor(dim.x / 2), Math.floor(dim.y / 2));

    this.camera.update();

    const previousRenderState = this._renderState;
    this.changeRenderState(RendererConstant.ID);

    // Prepare state
    const prev = this.camera.camera3D.layers.mask;
    this.camera.camera3D.layers.mask = 1 << this.wgs84TileLayer.threejsLayer;

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

const matrix = new THREE.Matrix4();
const screen = new THREE.Vector2();
const pickWorldPosition = new THREE.Vector3();
const ray = new THREE.Ray();
const direction = new THREE.Vector3();
const depthRGBA = new THREE.Vector4();
GlobeView.prototype.getPickingPositionFromDepth = function getPickingPositionFromDepth(mouse) {
    const dim = this.mainLoop.gfxEngine.getWindowSize();
    mouse = mouse || dim.clone().multiplyScalar(0.5);


    var camera = this.camera.camera3D;
    this.camera.update();

    // Prepare state
    const prev = this.camera.camera3D.layers.mask;
    this.camera.camera3D.layers.mask = 1 << this.wgs84TileLayer.threejsLayer;

    const previousRenderState = this._renderState;
    this.changeRenderState(RendererConstant.DEPTH);

    // Render to buffer
    var buffer = this.mainLoop.gfxEngine.renderViewTobuffer(
        this,
        this.mainLoop.gfxEngine.fullSizeRenderTarget,
        mouse.x, dim.y - mouse.y,
        1, 1);

    screen.x = (mouse.x / dim.x) * 2 - 1;
    screen.y = -(mouse.y / dim.y) * 2 + 1;

    camera.matrixWorld.setPosition(camera.position);

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

    var angle = direction.angleTo(ray.direction);

    depthRGBA.fromArray(buffer).divideScalar(255.0);

    var depth = unpack1K(depthRGBA, 100000000.0) / Math.cos(angle);

    pickWorldPosition.addVectors(camera.position, ray.direction.setLength(depth));

    // Restore initial state
    this.changeRenderState(previousRenderState);
    camera.layers.mask = prev;
    camera.updateMatrixWorld(true);

    if (pickWorldPosition.length() > 10000000)
        { return undefined; }

    return pickWorldPosition;
};

GlobeView.prototype.changeRenderState = function changeRenderState(newRenderState) {
    if (this._renderState == newRenderState || !this.wgs84TileLayer.level0Nodes) {
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

    for (const n of this.wgs84TileLayer.level0Nodes) {
        n.traverseVisible(changeStateFunction);
    }
    this._renderState = newRenderState;
};

GlobeView.prototype.setRealisticLightingOn = function setRealisticLightingOn(value) {
    const coSun = CoordStars.getSunPositionInScene(new Date().getTime(), 48.85, 2.35).normalize();

    this.lightingPos = coSun.normalize();

    const lighting = this.wgs84TileLayer.lighting;
    lighting.enable = value;
    lighting.position = coSun;

    this.atmosphere.updateLightingPos(coSun);
    this.atmosphere.setRealisticOn(value);
    this.clouds.updateLightingPos(coSun);
    this.clouds.setLightingOn(value);

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
