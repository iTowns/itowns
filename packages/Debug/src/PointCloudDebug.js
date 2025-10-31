import { View, PNTS_MODE, PNTS_SHAPE, PNTS_SIZE_MODE, GeometryLayer } from 'itowns';
import * as THREE from 'three';
import OBBHelper from './OBBHelper';

const folderName = 'Styling';

function getController(gui, name) {
    const controllers = gui.folders.filter(f => f._title === folderName)[0].controllers;
    const controller = controllers.filter(c => (c.property === name || c.name === name))[0];
    return controller;
}

function setupControllerVisibily(gui, displayMode, sizeMode) {
    displayMode =  parseInt(displayMode, 10);
    if ([PNTS_MODE.INTENSITY, PNTS_MODE.ELEVATION, PNTS_MODE.SCAN_ANGLE].includes(displayMode)) {
        getController(gui, 'gradient').show();
    } else {
        getController(gui, 'gradient').hide();
    }
    if (PNTS_MODE.INTENSITY === displayMode) {
        getController(gui, 'minIntensityRange').show();
        getController(gui, 'maxIntensityRange').show();
    } else {
        getController(gui, 'minIntensityRange').hide();
        getController(gui, 'maxIntensityRange').hide();
    }
    if (PNTS_MODE.ELEVATION === displayMode) {
        getController(gui, 'minElevationRange').show();
        getController(gui, 'maxElevationRange').show();
    } else {
        getController(gui, 'minElevationRange').hide();
        getController(gui, 'maxElevationRange').hide();
    }
    if (PNTS_MODE.SCAN_ANGLE === displayMode) {
        getController(gui, 'minAngleRange').show();
        getController(gui, 'maxAngleRange').show();
    } else {
        getController(gui, 'minAngleRange').hide();
        getController(gui, 'maxAngleRange').hide();
    }

    sizeMode =  parseInt(sizeMode, 10);
    if (sizeMode === PNTS_SIZE_MODE.VALUE) {
        getController(gui, 'minAttenuatedSize').hide();
        getController(gui, 'maxAttenuatedSize').hide();
    } else {
        getController(gui, 'minAttenuatedSize').show();
        getController(gui, 'maxAttenuatedSize').show();
    }
}

/**
 * Generate the position array of the bbox corner form the bbox
 * Adapted from THREE.BoxHelper.js
 * https://github.com/mrdoob/three.js/blob/master/src/helpers/BoxHelper.js
 *
 * @param {THREE.box3} bbox - Box3 of the node
 * @returns {array}
 */
function getCornerPosition(bbox) {
    const array =  new Float32Array(8 * 3);

    const min = bbox.min;
    const max = bbox.max;

    /*
      5____4
    1/___0/|
    | 6__|_7
    2/___3/

    0: max.x, max.y, max.z
    1: min.x, max.y, max.z
    2: min.x, min.y, max.z
    3: max.x, min.y, max.z
    4: max.x, max.y, min.z
    5: min.x, max.y, min.z
    6: min.x, min.y, min.z
    7: max.x, min.y, min.z
    */
    array[0] = max.x; array[1] = max.y; array[2] = max.z;
    array[3] = min.x; array[4] = max.y; array[5] = max.z;
    array[6] = min.x; array[7] = min.y; array[8] = max.z;
    array[9] = max.x; array[10] = min.y; array[11] = max.z;
    array[12] = max.x; array[13] = max.y; array[14] = min.z;
    array[15] = min.x; array[16] = max.y; array[17] = min.z;
    array[18] = min.x; array[19] = min.y; array[20] = min.z;
    array[21] = max.x; array[22] = min.y; array[23] = min.z;
    return array;
}

const red =  new THREE.Color(0xff0000);
function debugIdUpdate(context, layer, node) {
    // filtering helper attached to node with the current debug layer
    if (!node.link) {
        node.link = {};
    }
    let helper = node.link[layer.id];
    if (node.visible) {
        if (!helper) {
            helper = new THREE.Group();

            // node obbes
            const obbHelper = new OBBHelper(node.clampOBB, node.voxelKey, red);
            obbHelper.layer = layer;
            helper.add(obbHelper);

            // point data boxes (in local ref)
            const tightboxHelper = new THREE.BoxHelper(undefined, 0x0000ff);
            if (node.obj) {
                tightboxHelper.geometry.attributes.position.array = getCornerPosition(node.obj.geometry.boundingBox);
                tightboxHelper.applyMatrix4(node.obj.matrixWorld);
                node.obj.tightboxHelper = tightboxHelper;
                helper.add(tightboxHelper);
                tightboxHelper.updateMatrixWorld(true);
            } else if (node.promise) {
                // TODO rethink architecture of node.obj/node.promise ?
                node.promise.then(() => {
                    if (node.obj) {
                        tightboxHelper.geometry.attributes.position.array = getCornerPosition(node.obj.geometry.boundingBox);
                        tightboxHelper.applyMatrix4(node.obj.matrixWorld);
                        node.obj.tightboxHelper = tightboxHelper;
                        helper.add(tightboxHelper);
                        tightboxHelper.updateMatrixWorld(true);
                    }
                });
            }

            node.link[layer.id] = helper;
        } else {
            node.link[layer.id].visible = true;
        }

        layer.object3d.add(helper);

        if (node.children && node.children.length) {
            if (node.sse >= 1) {
                return node.children;
            } else {
                for (const child of node.children) {
                    if (child.link?.[layer.id]) {
                        child.link[layer.id].visible = false;
                    }
                }
            }
        }
    } else if (helper) {
        layer.object3d.remove(helper);
    }
}

class DebugLayer extends GeometryLayer {
    constructor(id, options = {}) {
        super(id, options.object3d || new THREE.Group(), options);
        this.update = debugIdUpdate;
        this.isDebugLayer = true;
        this.layer = options.layer;
    }

    preUpdate(context, sources) {
        if (sources.has(this.parent)) {
            this.object3d.clear();
        }
        return this.layer.preUpdate(context, sources);
    }
}

export default {
    initTools(view, layer, datUi) {
        datUi.title('Layer Controls');
        layer.debugUI = datUi.addFolder(`${layer.id}`);

        const update = () => {
            setupControllerVisibily(layer.debugUI, layer.material.mode, layer.material.sizeMode);
            view.notifyChange(layer, true);
        };

        layer.debugUI.add(layer, 'visible').name('Visible').onChange(update);
        layer.debugUI.add(layer, 'sseThreshold').name('SSE threshold').onChange(update);
        layer.debugUI.add(layer, 'octreeDepthLimit', -1, 20).name('Depth limit').onChange(update);
        layer.debugUI.add(layer, 'pointBudget', 1, 15000000).name('Max point count').onChange(update);
        layer.debugUI.add(layer.object3d.position, 'z', -5000, 5000).name('Z translation').onChange(() => {
            layer.object3d.updateMatrixWorld();
            view.notifyChange(layer);
        });

        layer.dbgStickyNode = '';
        layer.dbgDisplaySticky = false;
        layer.dbgDisplayChildren = true;
        layer.dbgDisplayParents = true;

        const styleUI = layer.debugUI.addFolder(folderName).close();
        if (layer.material.mode != undefined) {
            const modeNames = Object.keys(PNTS_MODE);
            const mode = modeNames.filter(v => PNTS_MODE[v] === layer.material.mode)[0];
            styleUI.add({ mode }, 'mode', modeNames).name('Display mode')
                .onChange((value) => {
                    layer.material.mode = PNTS_MODE[value];
                    update();
                });

            const classeUI = styleUI.addFolder('Classe Visibility').close();
            Object.entries(layer.material.classificationScheme).forEach((classe) => {
                classeUI.add(classe[1], 'visible').name(classe[1].name)
                    .onChange(() => {
                        layer.material.recomputeVisibilityTexture();
                        update();
                    });
            });

            const gradiantsNames = Object.keys(layer.material.gradients);
            styleUI.add({ gradient: gradiantsNames[0] }, 'gradient', gradiantsNames).name('gradient')
                .onChange((value) => {
                    layer.material.gradient = layer.material.gradients[value];
                    update();
                });
            styleUI.add(layer, 'minIntensityRange', layer.minIntensityRange, layer.maxIntensityRange - 1).name('Intensity min')
                .onChange((value) => {
                    if (value >= layer.maxIntensityRange) {
                        layer.maxIntensityRange = value + 1;
                        getController(layer.debugUI, 'maxIntensityRange').updateDisplay();
                    }
                    update();
                });
            styleUI.add(layer, 'maxIntensityRange', layer.minIntensityRange + 1, layer.maxIntensityRange).name('Intensity max')
                .onChange((value) => {
                    if (value <= layer.minIntensityRange) {
                        layer.minIntensityRange = value - 1;
                        getController(layer.debugUI, 'minIntensityRange').updateDisplay();
                    }
                    update();
                });
            styleUI.add(layer, 'minElevationRange', layer.minElevationRange, layer.maxElevationRange).name('Elevation min')
                .onChange((value) => {
                    if (value >= layer.maxElevationRange) {
                        layer.maxElevationRange = value + 1;
                        getController(layer.debugUI, 'maxElevationRange').updateDisplay();
                    }
                    update();
                });
            styleUI.add(layer, 'maxElevationRange', layer.minElevationRange, layer.maxElevationRange).name('Elevation max')
                .onChange((value) => {
                    if (value <= layer.minElevationRange) {
                        layer.minElevationRange = value - 1;
                        getController(layer.debugUI, 'minElevationRange').updateDisplay();
                    }
                    update();
                });
            styleUI.add(layer, 'minAngleRange', layer.minAngleRange, layer.maxAngleRange).name('Angle min')
                .onChange((value) => {
                    if (value >= layer.maxAngleRange) {
                        layer.maxAngleRange = value + 1;
                        getController(layer.debugUI, 'maxAngleRange').updateDisplay();
                    }
                    update();
                });
            styleUI.add(layer, 'maxAngleRange', layer.minAngleRange, layer.maxAngleRange).name('Angle max')
                .onChange((value) => {
                    if (value <= layer.minAngleRange) {
                        layer.minAngleRange = value - 1;
                        getController(layer.debugUI, 'minAngleRange').updateDisplay();
                    }
                    update();
                });
        }
        if (layer.material.shape != undefined) {
            styleUI.add(layer.material, 'shape', PNTS_SHAPE).name('Shape mode').onChange(update);
        }
        if (layer.material.gamma != undefined) {
            styleUI.add(layer.material, 'gamma', 1, 10).name('Gamma').onChange(update);
        }
        if (layer.material.ambientBoost != undefined) {
            styleUI.add(layer.material, 'ambientBoost', 0, 0.5).name('Ambient Boost').onChange(update);
        }

        styleUI.add(layer, 'opacity', 0, 1).name('Layer opacity').onChange(update);
        styleUI.add(layer, 'pointSize', 0, 15).name('Point size').onChange(update);
        if (layer.material.sizeMode != undefined && view.camera.camera3D.isPerspectiveCamera) {
            styleUI.add(layer.material, 'sizeAttenuation').name('Size attenuation')
                .onChange(update);
            styleUI.add(layer.material, 'minAttenuatedSize', 0, 15).name('Min size')
                .onChange((value) => {
                    if (value > layer.material.maxAttenuatedSize) {
                        layer.material.maxAttenuatedSize = value;
                        getController(layer.debugUI, 'maxAttenuatedSize').updateDisplay();
                    }
                    update();
                });
            styleUI.add(layer.material, 'maxAttenuatedSize', 0, 15).name('Max size')
                .onChange((value) => {
                    if (value < layer.material.minAttenuatedSize) {
                        layer.material.minAttenuatedSize = value;
                        getController(layer.debugUI, 'minAttenuatedSize').updateDisplay();
                    }
                    update();
                });
        }

        if (layer.material.picking != undefined) {
            styleUI.add(layer.material, 'picking').name('Display picking id').onChange(update);
        }

        // UI
        const debugUI = layer.debugUI.addFolder('Debug').close();

        const obb_layer_id = `${layer.id}_obb_debug`;
        const obbLayer = new DebugLayer(obb_layer_id, {
            visible: false,
            cacheLifeTime: Infinity,
            source: false,
            layer,
        });

        if (view.getLayerById(obbLayer.id)) {
            view.removeLayer(obbLayer.id);
        }
        View.prototype.addLayer.call(view, obbLayer);

        debugUI.add(obbLayer, 'visible').name('Display Bounding Boxes')
            .onChange(() => {
                view.notifyChange(obbLayer);
            });

        debugUI.add(layer, 'dbgStickyNode').name('Sticky node name').onChange(update);
        debugUI.add(layer, 'dbgDisplaySticky').name('Display sticky node').onChange(update);
        debugUI.add(layer, 'dbgDisplayChildren').name('Display children of sticky node').onChange(update);
        debugUI.add(layer, 'dbgDisplayParents').name('Display parents of sticky node').onChange(update);

        setupControllerVisibily(layer.debugUI, layer.material.mode, layer.material.sizeMode);

        const isInHierarchy = function isInHierarchy(name1, name2) {
            return (layer.dbgDisplaySticky && name1 === name2)
                || (layer.dbgDisplayParents && name1.startsWith(name2))
                || (layer.dbgDisplayChildren && name2.startsWith(name1));
        };

        view.addFrameRequester('before_layer_update', () => {
            if (layer.dbgStickyNode.length) {
                layer.displayedCount = 0;
                const stickies = layer.dbgStickyNode.split(',');
                for (const pts of layer.group.children) {
                    pts.visible = stickies.some(name => isInHierarchy(name, pts.owner.name));
                    if (pts.boxHelper) {
                        pts.boxHelper.visible = pts.visible;
                    }
                    if (pts.visible) {
                        layer.displayedCount += pts.geometry.attributes.position.count;
                    }
                }
            }
        });
    },
};
