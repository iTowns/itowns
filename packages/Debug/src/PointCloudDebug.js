import { PNTS_MODE, PNTS_SHAPE, PNTS_SIZE_MODE } from 'itowns';
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

function createVoxelOBBHelper(node) {
    const helper = new OBBHelper(node.voxelOBB, new THREE.Color(THREE.Color.NAMES.darkred));
    helper.name = node.id;
    return helper;
}

function createClampOBBHelper(node) {
    const helper = new OBBHelper(node.clampOBB, new THREE.Color(THREE.Color.NAMES.red));
    helper.name = node.id;
    return helper;
}

function createPointsOBBHelper(node) {
    // point data OBBes
    const pointsOBBes = new THREE.Group();
    pointsOBBes.name = node.id;

    if (node.obj) {
        const pointsOBB = {
            position: node.obj.position.clone(),
            quaternion: node.obj.quaternion.clone(),
            box3D: node.obj.geometry.boundingBox.clone(),
        };
        const pointsOBBHelper = new OBBHelper(pointsOBB, new THREE.Color(THREE.Color.NAMES.yellow));
        pointsOBBes.add(pointsOBBHelper);
    } else if (node.promise) {
        // TODO rethink architecture of node.obj/node.promise ?
        node.promise.then(() => {
            if (node.obj) {
                const pointsOBB = {
                    position: node.obj.position.clone(),
                    quaternion: node.obj.quaternion.clone(),
                    box3D: node.obj.geometry.boundingBox.clone(),
                };
                const pointsOBBHelper = new OBBHelper(pointsOBB, new THREE.Color(THREE.Color.NAMES.yellow));
                pointsOBBes.add(pointsOBBHelper);
            }
        });
    }
    return pointsOBBes;
}

const NODE_BOXES_SYMBOL = Symbol('PointCloudNode.boxes');

class PointCloudDebug {
    constructor() {
        this.displayPointsBounds = false;
        this.displayVoxelBounds = false;
        this.displayClampBounds = false;

        this.layer = null;
        this._onTileVisibilityChange = null;
        this._onDisposeModel = null;
        this._update = null;

        this.group = new THREE.Group();

        this.voxelOBBGroup = new THREE.Group();
        this.voxelOBBGroup.name = 'PointCloudDebug.voxelOBBGroup';
        this.group.add(this.voxelOBBGroup);
        this.voxelOBBGroup.updateMatrixWorld();

        this.clampOBBGroup = new THREE.Group();
        this.clampOBBGroup.name = 'PointCloudDebug.clampOBBGroup';
        this.group.add(this.clampOBBGroup);
        this.clampOBBGroup.updateMatrixWorld();

        this.pointsOBBGroup = new THREE.Group();
        this.pointsOBBGroup.name = 'PointCloudDebug.pointsOBBGroup';
        this.group.add(this.pointsOBBGroup);
        this.pointsOBBGroup.updateMatrixWorld();
    }

    init(layer) {
        this.layer = layer;

        this._onTileVisibilityChange = this.onTileVisibilityChange.bind(this);
        this._onDisposeModel = this.onDisposeModel.bind(this);
        this._update = this.update.bind(this);

        layer.addEventListener('dispose-model', this._onDisposeModel);
        layer.addEventListener('post-update', this._update);
        layer.addEventListener('node-visibility-change', this._onTileVisibilityChange);
    }

    onDisposeModel({ tile }) {
        const helpers = tile[NODE_BOXES_SYMBOL]; // Group of OBB helpers?
        if (helpers) {
            helpers.voxelOBB.dispose();
            helpers.clampOBB.dispose();
            helpers.pointsOBB.children.forEach(child => child.dispose());
            delete tile[NODE_BOXES_SYMBOL];
        }
    }

    onTileVisibilityChange({ tile, visible }) {
        let helpers = tile[NODE_BOXES_SYMBOL];
        if (visible && !helpers) {
            helpers = {
                voxelOBB: createVoxelOBBHelper(tile),
                clampOBB: createClampOBBHelper(tile),
                pointsOBB: createPointsOBBHelper(tile),
            };
            tile[NODE_BOXES_SYMBOL] = helpers;
        }

        if (helpers) {
            if (!visible) {
                this.voxelOBBGroup.remove(helpers.voxelOBB);
                this.clampOBBGroup.remove(helpers.clampOBB);
                this.pointsOBBGroup.remove(helpers.pointsOBB);
            } else {
                this.voxelOBBGroup.add(helpers.voxelOBB);
                helpers.voxelOBB.updateMatrixWorld(true);
                this.clampOBBGroup.add(helpers.clampOBB);
                helpers.clampOBB.updateMatrixWorld(true);
                this.pointsOBBGroup.add(helpers.pointsOBB);
                helpers.pointsOBB.updateMatrixWorld(true);
            }
        }
    }

    update() {
        this.voxelOBBGroup.visible = this.displayVoxelBounds;
        this.clampOBBGroup.visible = this.displayClampBounds;
        this.pointsOBBGroup.visible = this.displayPointsBounds;
    }

    dispose() {
        const { layer, voxelOBBGroup } = this;

        layer?.removeEventListener('dispose-model', this._onDisposeModel);
        layer?.removeEventListener('update-after', this._update);
        layer?.removeEventListener('node-visibility-change', this._onTileVisibilityChange);

        voxelOBBGroup?.removeFromParent();
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

        const debugBoxes = new PointCloudDebug();
        debugBoxes.init(layer);
        view.scene.add(debugBoxes.group);

        debugUI.add(debugBoxes, 'displayVoxelBounds').name('Node OBB (voxel)').onChange(() => {
            view.notifyChange(layer, true);
        });
        debugUI.add(debugBoxes, 'displayClampBounds').name('Node OBB (clamp)').onChange(() => {
            view.notifyChange(layer, true);
        });
        debugUI.add(debugBoxes, 'displayPointsBounds').name('Points OBB').onChange(() => {
            view.notifyChange(layer, true);
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
