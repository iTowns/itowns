import * as THREE from 'three';

import View from '../View';
import { RENDERING_PAUSED, MAIN_LOOP_EVENTS } from '../MainLoop';
import RendererConstant from '../../Renderer/RendererConstant';
import CameraUtils from '../../utils/CameraUtils';

import PlanarLayer from './Planar/PlanarLayer';

export function createPlanarLayer(id, extent, options) {
    console.warn('createPlanarLayer is deprecated, use the PlanarLayer class instead.');
    return new PlanarLayer(id, extent, options.object3d, options);
}

function PlanarView(viewerDiv, extent, options = {}) {
    THREE.Object3D.DefaultUp.set(0, 0, 1);

    // Setup View
    View.call(this, extent.crs(), viewerDiv, options);

    // Configure camera
    const dim = extent.dimensions();
    const max = Math.max(dim.x, dim.y);
    const camera3D = this.camera.camera3D;
    camera3D.near = 0.1;
    camera3D.far = 2 * max;
    this.camera.camera3D.updateProjectionMatrix();

    const tileLayer = new PlanarLayer('planar', extent, options.object3d, options);

    this.addLayer(tileLayer);

    const p = { coord: extent.center(), range: max, tilt: 20, heading: 0 };
    CameraUtils.transformCameraToLookAtTarget(this, camera3D, p);

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
    const currentWireframe = this.tileLayer.wireframe;
    const currentOpacity = this.tileLayer.opacity;
    const currentVisibility = this.tileLayer.visible;
    if (currentWireframe) {
        this.tileLayer.wireframe = false;
    }
    if (currentOpacity < 1.0) {
        this.tileLayer.opacity = 1.0;
    }
    if (!currentVisibility) {
        this.tileLayer.visible = true;
    }
    const restoreState = this.tileLayer.level0Nodes[0].pushRenderState(RendererConstant.DEPTH);
    const buffer = g.renderViewToBuffer(
        { camera: this.camera, scene: this.tileLayer.object3d },
        { x, y, width, height });
    restoreState();
    if (this.tileLayer.wireframe !== currentWireframe) {
        this.tileLayer.wireframe = currentWireframe;
    }
    if (this.tileLayer.opacity !== currentOpacity) {
        this.tileLayer.opacity = currentOpacity;
    }
    if (this.tileLayer.visible !== currentVisibility) {
        this.tileLayer.visible = currentVisibility;
    }
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
    if (!this.tileLayer || this.tileLayer.level0Nodes.length == 0) {
        target = undefined;
        return;
    }
    const l = this.mainLoop;
    if (!this.tileLayer.level0Nodes[0]) {
        target = undefined;
        return;
    }
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
