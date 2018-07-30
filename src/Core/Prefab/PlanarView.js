import * as THREE from 'three';

import View from '../View';
import { RENDERING_PAUSED, MAIN_LOOP_EVENTS } from '../MainLoop';
import RendererConstant from '../../Renderer/RendererConstant';

import { GeometryLayer } from '../Layer/Layer';

import { processTiledGeometryNode } from '../../Process/TiledNodeProcessing';
import { planarCulling, planarSubdivisionControl, prePlanarUpdate } from '../../Process/PlanarTileProcessing';
import PlanarTileBuilder from './Planar/PlanarTileBuilder';
import SubdivisionControl from '../../Process/SubdivisionControl';
import Picking from '../Picking';

export function createPlanarLayer(id, extent, options) {
    const tileLayer = new GeometryLayer(id, options.object3d || new THREE.Group());
    tileLayer.extent = extent;
    tileLayer.schemeTile = [extent];

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

    tileLayer.preUpdate = (context, layer, changeSources) => {
        SubdivisionControl.preUpdate(context, layer);

        prePlanarUpdate(context, layer);

        if (__DEBUG__) {
            layer._latestUpdateStartingLevel = 0;
        }

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
            if (source.layer === layer) {
                if (!commonAncestor) {
                    commonAncestor = source;
                } else {
                    commonAncestor = source.findCommonAncestor(commonAncestor);
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
            return planarSubdivisionControl(options.maxSubdivisionLevel || 5,
                options.maxDeltaElevationLevel || 4)(context, layer, node);
        }
        return false;
    }

    tileLayer.update = processTiledGeometryNode(planarCulling, subdivision);
    tileLayer.builder = new PlanarTileBuilder();
    tileLayer.onTileCreated = nodeInitFn;
    tileLayer.protocol = 'tile';
    tileLayer.visible = true;
    tileLayer.lighting = {
        enable: false,
        position: { x: -0.5, y: 0.0, z: 1.0 },
    };
    // provide custom pick function
    tileLayer.pickObjectsAt = (_view, mouse, radius) => Picking.pickTilesAt(_view, mouse, radius, tileLayer);

    return tileLayer;
}

function PlanarView(viewerDiv, extent, options = {}) {
    THREE.Object3D.DefaultUp.set(0, 0, 1);

    // Setup View
    View.call(this, extent.crs(), viewerDiv, options);

    // Configure camera
    const dim = extent.dimensions();
    const positionCamera = extent.center().clone();
    positionCamera._values[2] = Math.max(dim.x, dim.y);
    const lookat = positionCamera.xyz();
    lookat.z = 0;

    this.camera.setPosition(positionCamera);
    this.camera.camera3D.lookAt(lookat);
    this.camera.camera3D.near = 0.1;
    this.camera.camera3D.far = 2 * Math.max(dim.x, dim.y);
    this.camera.camera3D.updateProjectionMatrix();
    this.camera.camera3D.updateMatrixWorld(true);

    const tileLayer = createPlanarLayer('planar', extent, options);

    this.addLayer(tileLayer);

    this._renderState = RendererConstant.FINAL;
    this._fullSizeDepthBuffer = null;
    this.addFrameRequester(MAIN_LOOP_EVENTS.BEFORE_RENDER, () => {
        if (this._fullSizeDepthBuffer != null) {
            // clean depth buffer
            this._fullSizeDepthBuffer = null;
        }
    });

    this.tileLayer = tileLayer;
}

PlanarView.prototype = Object.create(View.prototype);
PlanarView.prototype.constructor = PlanarView;

PlanarView.prototype.addLayer = function addLayer(layer) {
    return View.prototype.addLayer.call(this, layer, this.tileLayer);
};

PlanarView.prototype.selectNodeAt = function selectNodeAt(mouse) {
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


PlanarView.prototype.readDepthBuffer = function readDepthBuffer(x, y, width, height) {
    const g = this.mainLoop.gfxEngine;
    const restoreState = this.tileLayer.level0Nodes[0].pushRenderState(RendererConstant.DEPTH);
    const buffer = g.renderViewToBuffer(
        { camera: this.camera, scene: this.tileLayer.object3d },
        { x, y, width, height });
    restoreState();
    return buffer;
};

const matrix = new THREE.Matrix4();
const screen = new THREE.Vector2();
const ray = new THREE.Ray();
const direction = new THREE.Vector3();

/**
 * Returns the world position (view's crs: referenceCrs) under view coordinates.
 * This position is computed with depth buffer.
 *
 * @param      {THREE.Vector2}  mouse  position in view coordinates (in pixel), if it's null so it's view's center.
 * @param      {THREE.Vector3}  [target=THREE.Vector3()] target. the result will be copied into this Vector3. If not present a new one will be created.
 * @return     {THREE.Vector3}  the world position in view's crs: referenceCrs.
 */

PlanarView.prototype.getPickingPositionFromDepth = function getPickingPositionFromDepth(mouse, target = new THREE.Vector3()) {
    const l = this.mainLoop;
    const viewPaused = l.scheduler.commandsWaitingExecutionCount() == 0 && l.renderingState == RENDERING_PAUSED;
    const g = l.gfxEngine;
    const dim = g.getWindowSize();
    const camera = this.camera.camera3D;

    mouse = mouse || dim.clone().multiplyScalar(0.5);
    mouse.x = Math.floor(mouse.x);
    mouse.y = Math.floor(mouse.y);

    // Prepare state
    const prev = camera.layers.mask;
    camera.layers.mask = 1 << this.tileLayer.threejsLayer;

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

    target.addVectors(camera.position, ray.direction.setLength(length));

    camera.layers.mask = prev;

    if (target.length() > 10000000)
        { return undefined; }

    return target;
};

export default PlanarView;
