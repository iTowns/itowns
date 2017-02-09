import * as THREE from 'three';

import View from '../View';
import MainLoop from '../MainLoop';
import c3DEngine from '../../Renderer/c3DEngine';
import Scheduler from '../Scheduler/Scheduler';
import RendererConstant from '../../Renderer/RendererConstant';
import { unpack1K } from '../../Renderer/MatteIdsMaterial';

import { GeometryLayer } from '../Layer/Layer';

import { processTiledGeometryNode, initTiledGeometryLayer } from '../../Process/TiledNodeProcessing';
import { updateLayeredMaterialNodeImagery, updateLayeredMaterialNodeElevation } from '../../Process/LayeredMaterialNodeProcessing';
import { planarCulling, planarSubdivisionControl, planarSchemeTile } from '../../Process/PlanarTileProcessing';
import PlanarTileBuilder from './Planar/PlanarTileBuilder';


function PlanarView(viewerDiv, boundingbox) {
    const scheduler = new Scheduler();
    const engine = new c3DEngine(viewerDiv);

    this.engine = engine;

    // Setup View
    View.call(this, boundingbox.crs(), viewerDiv, new MainLoop(scheduler, engine));

    this.initDefaultProviders(scheduler);

    // Configure camera
    const dim = boundingbox.dimensions();
    const positionCamera = boundingbox.center().clone();
    positionCamera._values[2] = Math.max(dim.x, dim.y);
    const lookat = positionCamera.xyz();
    lookat.z = 0;

    this.camera.setPosition(positionCamera.xyz());
    this.camera.camera3D.lookAt(lookat);
    this.camera.camera3D.near = 0.1;
    this.camera.camera3D.far = 2 * Math.max(dim.x, dim.y);
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
    const SSE_SUBDIVISION_THRESHOLD = 6.0;

    const tileLayer = new GeometryLayer('planar');
    const initLayer = initTiledGeometryLayer(planarSchemeTile(boundingbox));

    tileLayer.preUpdate = (context, layer) => {
        if (layer.level0Nodes === undefined) {
            initLayer(context, layer);
        }
        return layer.level0Nodes;
    };
    tileLayer.update =
        processTiledGeometryNode(
            planarCulling,
            planarSubdivisionControl(6, SSE_SUBDIVISION_THRESHOLD),
            nodeInitFn);
    tileLayer.builder = new PlanarTileBuilder();

    const threejsLayer = engine.getUniqueThreejsLayer();
    tileLayer.type = 'geometry';
    tileLayer.protocol = 'tile';
    tileLayer.threejsLayer = threejsLayer;
    tileLayer.lighting = {
        enable: false,
        position: { x: -0.5, y: 0.0, z: 1.0 },
    };
    this.camera.camera3D.layers.enable(threejsLayer);

    this.addLayer(tileLayer);


    /*
    this.controls = new GlobeControls(
        this.camera.camera3D,
        positionTargetCamera.as('EPSG:4978').xyz(),
        engine.renderer.domElement,
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
    });*/

    // this.controls.addEventListener('selectClick', (event) => {
    //     this.selectNodeAt(event.mouse);
    // }, false);

    this._renderState = RendererConstant.FINAL;

    this.tileLayer = tileLayer;
}

PlanarView.prototype = Object.create(View.prototype);
PlanarView.prototype.constructor = PlanarView;

PlanarView.prototype.addLayer = function addLayer(layer) {
    if (layer.type == 'color') {
        layer.update = updateLayeredMaterialNodeImagery;
    } else if (layer.type == 'elevation') {
        layer.update = updateLayeredMaterialNodeElevation;
    }
    View.prototype.addLayer.call(this, layer, this.tileLayer);
    // we probably want to move some code from ApiGlobe.prototype.addImageryLayer|ApiPlanarView.prototype.addElevationLayer here
};

PlanarView.prototype.selectNodeAt = function selectNodeAt(mouse) {
    // this.scene.selectNodeId(
    const selectedId = this.screenCoordsToNodeId(mouse);

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

PlanarView.prototype.screenCoordsToNodeId = function screenCoordsToNodeId(mouse) {
    const dim = this.engine.getWindowSize();
    var camera = this.camera.camera3D;

    this.camera.update();
    // camera.updateMatrixWorld();

    const previousRenderState = this._renderState;
    this.changeRenderState(RendererConstant.ID);

    var buffer = this.engine.renderTobuffer(
        camera,
        mouse.x, dim.y - mouse.y,
        1, 1);

    this.changeRenderState(previousRenderState);

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
PlanarView.prototype.getPickingPositionFromDepth = function getPickingPositionFromDepth(mouse) {
    const dim = this.engine.getWindowSize();
    mouse = mouse || dim.clone().multiplyScalar(0.5);


    var camera = this.camera.camera3D;
    this.camera.update();
    // camera.updateMatrixWorld();

    // Prepare state
    const prev = this.camera.camera3D.layers.mask;
    this.camera.camera3D.layers.mask = 1 << this.tileLayer.threejsLayer;

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

PlanarView.prototype.changeRenderState = function changeRenderState(newRenderState) {
    if (this._renderState == newRenderState || !this.tileLayer.level0Nodes) {
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

    for (const n of this.tileLayer.level0Nodes) {
        n.traverseVisible(changeStateFunction);
    }
    this._renderState = newRenderState;
};

export default PlanarView;
