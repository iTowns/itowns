import * as THREE from 'three';

import View from '../View';
import MainLoop from '../MainLoop';
import c3DEngine from '../../Renderer/c3DEngine';
import Scheduler from '../Scheduler/Scheduler';
import RendererConstant from '../../Renderer/RendererConstant';
import GlobeControls from '../../Renderer/ThreeExtended/GlobeControls';
import { unpack1K } from '../../Renderer/MatteIdsMaterial';

import { GeometryLayer } from '../Layer/Layer';

import Atmosphere from './Globe/Atmosphere';
import Clouds from './Globe/Clouds';

import { C, ellipsoidSizes } from '../Geographic/Coordinates';
import { processTiledGeometryNode, initTiledGeometryLayer } from '../../Process/TiledNodeProcessing';
import { updateLayeredMaterialNodeImagery, updateLayeredMaterialNodeElevation } from '../../Process/LayeredMaterialNodeProcessing';
import { globeCulling, preGlobeUpdate, globeSubdivisionControl, globeSchemeTileWMTS, globeSchemeTile1 } from '../../Process/GlobeTileProcessing';
import BuilderEllipsoidTile from './Globe/BuilderEllipsoidTile';


function GlobeView(viewerDiv, coordCarto) {
    THREE.Object3D.DefaultUp.set(0, 0, 1);

    const scheduler = new Scheduler();
    const engine = new c3DEngine(viewerDiv);

    this.engine = engine;

    const size = ellipsoidSizes().x;
    // Setup View
    View.call(this, 'EPSG:4978', viewerDiv, new MainLoop(scheduler, engine));

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
        node.materials[0].setLightingOn(layer.lighting.enable);
        node.materials[0].uniforms.lightPosition.value = layer.lighting.position;

        if (__DEBUG__) {
            node.material.uniforms.showOutline = { value: layer.showOutline || false };
            node.material.wireframe = layer.wireframe || false;
        }
    };
    const SSE_SUBDIVISION_THRESHOLD = 1.0;

    const wgs84TileLayer = new GeometryLayer('globe');
    const initLayer = initTiledGeometryLayer(globeSchemeTileWMTS(globeSchemeTile1));
    wgs84TileLayer.preUpdate = (context, layer) => {
        if (layer.level0Nodes === undefined) {
            initLayer(context, layer);
        }
        preGlobeUpdate(context);
        return layer.level0Nodes;
    };
    wgs84TileLayer.update =
        processTiledGeometryNode(
            globeCulling,
            globeSubdivisionControl(2, 17, SSE_SUBDIVISION_THRESHOLD),
            nodeInitFn);
    wgs84TileLayer.builder = new BuilderEllipsoidTile();

    const threejsLayer = engine.getUniqueThreejsLayer();
    wgs84TileLayer.type = 'geometry';
    wgs84TileLayer.protocol = 'tile';
    wgs84TileLayer.threejsLayer = threejsLayer;
    wgs84TileLayer.lighting = {
        enable: false,
        position: { x: -0.5, y: 0.0, z: 1.0 },
    };
    this.camera.camera3D.layers.enable(threejsLayer);

    this.addLayer(wgs84TileLayer);

    // Atmosphere
    this.atmosphere = new Atmosphere();
    this.clouds = new Clouds();
    this.atmosphere.add(this.clouds);

    const atmosphereLayer = this.engine.getUniqueThreejsLayer();
    this.atmosphere.traverse((obj) => { obj.layers.set(atmosphereLayer); });
    this.camera.camera3D.layers.enable(atmosphereLayer);

    this.engine.scene3D.add(this.atmosphere);


    // Configure controls
    const positionTargetCamera = positionCamera.clone();
    positionTargetCamera.setAltitude(0);

    this.controls = new GlobeControls(
        this.camera.camera3D,
        positionTargetCamera.as('EPSG:4978').xyz(),
        engine.renderer.domElement,
        viewerDiv,
        engine,
        size,
        'EPSG:4978',
        this.getPickingPositionFromDepth.bind(this));
    this.controls.rotateSpeed = 0.25;
    this.controls.zoomSpeed = 2.0;
    this.controls.minDistance = 30;
    this.controls.maxDistance = size * 8.0;

    this.controls.addEventListener('change', () => {
        this.camera.update();
        this.notifyChange(0, true);
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
            this.engine.renderer.setClearColor(color.multiplyScalar(1.0 - t));
        } else if (len >= lim) {
            this.engine.renderer.setClearColor(0x030508);
        }
    };

    this.wgs84TileLayer = wgs84TileLayer;

    this.mainLoop.addEventListener('command-queue-empty', () => {
        viewerDiv.dispatchEvent(new CustomEvent('globe-built'));
    });

    window.addEventListener('resize', () => {
        this.controls.updateCamera(this.camera, this.viewerDiv.clientWidth, this.viewerDiv.clientHeight);
    }, false);
}

GlobeView.prototype = Object.create(View.prototype);
GlobeView.prototype.constructor = GlobeView;

GlobeView.prototype.addLayer = function addLayer(layer) {
    if (layer.type == 'color') {
        layer.update = updateLayeredMaterialNodeImagery;
    } else if (layer.type == 'elevation') {
        layer.update = updateLayeredMaterialNodeElevation;
    }
    View.prototype.addLayer.call(this, layer, this.wgs84TileLayer);
    // we probably want to move some code from ApiGlobe.prototype.addImageryLayer|ApiGlobeView.prototype.addElevationLayer here
};

GlobeView.prototype.selectNodeAt = function selectNodeAt(mouse) {
    // this.scene.selectNodeId(
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

    this.notifyChange(0, true);
};

GlobeView.prototype.screenCoordsToNodeId = function screenCoordsToNodeId(mouse) {
    const dim = this.engine.getWindowSize();
    var camera = this.camera.camera3D;

    mouse = mouse || new THREE.Vector2(Math.floor(dim.x / 2), Math.floor(dim.y / 2));

    this.camera.update();

    const previousRenderState = this._renderState;
    this.changeRenderState(RendererConstant.ID);

    // Prepare state
    const prev = this.camera.camera3D.layers.mask;
    this.camera.camera3D.layers.mask = 1 << this.wgs84TileLayer.threejsLayer;

    var buffer = this.engine.renderTobuffer(
        camera,
        mouse.x, dim.y - mouse.y,
        1, 1);

    this.changeRenderState(previousRenderState);
    this.camera.camera3D.layers.mask = prev;

    var depthRGBA = new THREE.Vector4().fromArray(buffer).divideScalar(255.0);

    // unpack RGBA to float
    var unpack = unpack1K(depthRGBA, 10000);

    return Math.round(unpack);
};


const matrix = new THREE.Matrix4();
matrix.elements = new Float64Array(16); // /!\ WARNING Matrix JS are in Float32Array
const screen = new THREE.Vector2();
const pickWorldPosition = new THREE.Vector3();
const ray = new THREE.Ray();
const direction = new THREE.Vector3();
const depthRGBA = new THREE.Vector4();
GlobeView.prototype.getPickingPositionFromDepth = function getPickingPositionFromDepth(mouse) {
    const dim = this.engine.getWindowSize();
    mouse = mouse || dim.clone().multiplyScalar(0.5);


    var camera = this.camera.camera3D;
    this.camera.update();

    // Prepare state
    const prev = this.camera.camera3D.layers.mask;
    this.camera.camera3D.layers.mask = 1 << this.wgs84TileLayer.threejsLayer;

    const previousRenderState = this._renderState;
    this.changeRenderState(RendererConstant.DEPTH);

    // Render to buffer
    var buffer = this.engine.renderTobuffer(
        camera,
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

export default GlobeView;
