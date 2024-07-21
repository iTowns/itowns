import * as THREE from 'three';
import View from 'Core/View';
import GeometryLayer from 'Layer/GeometryLayer';
import { C3DTilesBoundingVolumeTypes } from 'Core/3DTiles/C3DTilesEnums';
import { PNTS_MODE, PNTS_SHAPE, PNTS_SIZE_MODE } from 'Renderer/PointsMaterial';
import GeometryDebug from './GeometryDebug';

const bboxMesh = new THREE.Mesh();

export default function create3dTilesDebugUI(datDebugTool, view, _3dTileslayer) {
    const gui = GeometryDebug.createGeometryDebugUI(datDebugTool, view, _3dTileslayer);

    // add wireframe
    GeometryDebug.addWireFrameCheckbox(gui, view, _3dTileslayer);

    // Bounding box control
    const boundingVolumeID = `${_3dTileslayer.id}_bounding_volume_debug`;

    function debugIdUpdate(context, layer, node) {
        // Tile (https://github.com/CesiumGS/3d-tiles/blob/main/specification/schema/tile.schema.json) containing
        // metadata for the tile
        const tile = node.userData.metadata;

        // Get helper from the node if it has already been computed
        let helper = node.userData.boundingVolumeHelper;

        // Hide bounding volumes if 3D Tiles layer is hidden
        if (helper) {
            helper.visible = !!(layer.visible && node.visible);
            return;
        }

        if (layer.visible && node.visible && tile.boundingVolume) {
            if (tile.boundingVolume.initialVolumeType === C3DTilesBoundingVolumeTypes.box) {
                bboxMesh.geometry.boundingBox = tile.boundingVolume.volume;
                helper = new THREE.BoxHelper(bboxMesh);
                helper.material.linewidth = 2;
                // compensate GLTF orientation correction based on gltfUpAxis only for b3dm tiles
                if (tile.content?.uri && tile.content?.uri.endsWith('b3dm')) {
                    const gltfUpAxis = _3dTileslayer.tileset.asset.gltfUpAxis;
                    if (gltfUpAxis === undefined || gltfUpAxis === 'Y') {
                        helper.rotation.x = -Math.PI * 0.5;
                    } else if (gltfUpAxis === 'X') {
                        helper.rotation.z = -Math.PI * 0.5;
                    }
                    helper.updateMatrix();
                }
            } else if (tile.boundingVolume.initialVolumeType === C3DTilesBoundingVolumeTypes.sphere ||
                       tile.boundingVolume.initialVolumeType === C3DTilesBoundingVolumeTypes.region) {
                const geometry = new THREE.SphereGeometry(tile.boundingVolume.volume.radius, 32, 32);
                const material = new THREE.MeshBasicMaterial({ wireframe: true, color: Math.random() * 0xffffff });
                helper = new THREE.Mesh(geometry, material);
            } else {
                console.warn(`[3D Tiles Debug]: Unknown bounding volume: ${tile.boundingVolume}`);
                return;
            }

            node.userData.boundingVolumeHelper = helper;

            node.parent.add(helper);
            helper.updateMatrixWorld(true);
        }
    }

    const boundingVolumeLayer = new GeometryLayer(boundingVolumeID, new THREE.Object3D(), {
        visible: false,
        cacheLifeTime: Infinity,
        source: false,
    });
    boundingVolumeLayer.update = debugIdUpdate;

    View.prototype.addLayer.call(view, boundingVolumeLayer, _3dTileslayer).then((l) => {
        gui.add(l, 'visible').name('Bounding boxes').onChange(() => {
            view.notifyChange(view.camera3D);
        });
    });

    // The sse Threshold for each tile
    gui.add(_3dTileslayer, 'sseThreshold', 0, 100).name('sseThreshold').onChange(() => {
        view.notifyChange(view.camera3D);
    });
    gui.add({ frozen: _3dTileslayer.frozen }, 'frozen').onChange(((value) => {
        _3dTileslayer.frozen = value;
        view.notifyChange(_3dTileslayer);
    }));

    if (_3dTileslayer.hasPnts) {
        const _3DTILES_PNTS_MODE = {
            CLASSIFICATION: PNTS_MODE.CLASSIFICATION,
            COLOR: PNTS_MODE.COLOR,
        };
        gui.add(_3dTileslayer, 'pntsMode', _3DTILES_PNTS_MODE).name('Display mode').onChange(() => {
            _3dTileslayer.pntsMode = +_3dTileslayer.pntsMode;
            view.notifyChange(view.camera.camera3D);
        });
        gui.add(_3dTileslayer, 'pntsShape', PNTS_SHAPE).name('Points Shape').onChange(() => {
            view.notifyChange(view.camera.camera3D);
        });
        gui.add(_3dTileslayer, 'pntsSizeMode', PNTS_SIZE_MODE).name('Pnts size mode').onChange(() => {
            view.notifyChange(view.camera.camera3D);
        });

        gui.add(_3dTileslayer, 'pntsMinAttenuatedSize', 0, 15).name('Min attenuated size').onChange(() => {
            view.notifyChange(view.camera.camera3D);
        });
        gui.add(_3dTileslayer, 'pntsMaxAttenuatedSize', 0, 15).name('Max attenuated size').onChange(() => {
            view.notifyChange(view.camera.camera3D);
        });
    }
}
