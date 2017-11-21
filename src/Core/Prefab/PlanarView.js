import * as THREE from 'three';

import View from '../View';
import { RENDERING_PAUSED } from '../MainLoop';
import RendererConstant from '../../Renderer/RendererConstant';
import { unpack1K } from '../../Renderer/LayeredMaterial';

import { GeometryLayer } from '../Layer/Layer';

import { processTiledGeometryNode } from '../../Process/TiledNodeProcessing';
import { planarCulling, planarSubdivisionControl } from '../../Process/PlanarTileProcessing';
import PlanarTileBuilder from './Planar/PlanarTileBuilder';
import SubdivisionControl from '../../Process/SubdivisionControl';

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

    tileLayer.preUpdate = (context, layer, changeSources) => {
        SubdivisionControl.preUpdate(context, layer);

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
            return planarSubdivisionControl(options.maxSubdivisionLevel || 5)(context, layer, node);
        }
        return false;
    }

    tileLayer.update = processTiledGeometryNode(planarCulling, subdivision);
    tileLayer.builder = new PlanarTileBuilder();
    tileLayer.onTileCreated = nodeInitFn;
    tileLayer.type = 'geometry';
    tileLayer.protocol = 'tile';
    tileLayer.visible = true;
    tileLayer.lighting = {
        enable: false,
        position: { x: -0.5, y: 0.0, z: 1.0 },
    };

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

    this.baseLayer = tileLayer;
}

PlanarView.prototype = Object.create(View.prototype);
PlanarView.prototype.constructor = PlanarView;

// Preprocess layer for a Plane if needed
PlanarView.prototype._preAddLayer = function _preAddLayer(layer) {
    this._deprecatedPreAddLayer(layer);
    if (layer.type == 'color') {
        if (layer.protocol === 'rasterizer') {
            layer.reprojection = this.referenceCrs;
        }
    }
};

/**
 * Calls View.addLayer using this.baseLayer as the parent layer
 * @param {Layer} layer: layer to attach to the planar geometry
 * @deprecated
 * @return {Promise} see View.addLayer
 */
PlanarView.prototype.addLayer = function addLayer(layer) {
    if (layer instanceof GeometryLayer) {
        return View.prototype.addLayer.call(this, layer);
    }
    if (!this._warnAddLayerDeprecated) {
        // eslint-disable-next-line no-console
        console.warn('globeView.addLayer(colorLayer) has been deprecated.\n' +
            'Use globeView.baseLayer.[addColorLayer|addElevationLayer|addFeatureLayer](layer) instead.');
        this._warnAddLayerDeprecated = true;
    }
    return View.prototype.addLayer.call(this, layer, this.baseLayer);
};

PlanarView.prototype.selectNodeAt = function selectNodeAt(mouse) {
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

    this.notifyChange();
};

PlanarView.prototype.screenCoordsToNodeId = function screenCoordsToNodeId(mouse) {
    const dim = this.mainLoop.gfxEngine.getWindowSize();

    const previousRenderState = this._renderState;
    this.changeRenderState(RendererConstant.ID);

    var buffer = this.mainLoop.gfxEngine.renderViewTobuffer(
        this,
        this.mainLoop.gfxEngine.fullSizeRenderTarget,
        mouse.x, dim.y - mouse.y,
        1, 1);

    this.changeRenderState(previousRenderState);

    var depthRGBA = new THREE.Vector4().fromArray(buffer).divideScalar(255.0);

    // unpack RGBA to float
    var unpack = unpack1K(depthRGBA, Math.pow(256, 3));

    return Math.round(unpack);
};

PlanarView.prototype.readDepthBuffer = function readDepthBuffer(x, y, width, height) {
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
PlanarView.prototype.getPickingPositionFromDepth = function getPickingPositionFromDepth(mouse) {
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

PlanarView.prototype.changeRenderState = function changeRenderState(newRenderState) {
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

export default PlanarView;
