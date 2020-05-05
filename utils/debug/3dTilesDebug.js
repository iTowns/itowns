import * as THREE from 'three';
import View from 'Core/View';
import GeometryLayer from 'Layer/GeometryLayer';
import GeometryDebug from './GeometryDebug';
import OBBHelper from './OBBHelper';

const bboxMesh = new THREE.Mesh();

export default function create3dTilesDebugUI(datDebugTool, view, _3dTileslayer) {
    const gui = GeometryDebug.createGeometryDebugUI(datDebugTool, view, _3dTileslayer);

    const regionBoundingBoxParent = new THREE.Group();
    view.scene.add(regionBoundingBoxParent);

    // add wireframe
    GeometryDebug.addWireFrameCheckbox(gui, view, _3dTileslayer);

    // Bounding box control
    const obb_layer_id = `${_3dTileslayer.id}_obb_debug`;

    function debugIdUpdate(context, layer, node) {
        const enabled = context.camera.camera3D.layers.test({ mask: 1 << layer.threejsLayer });

        if (!enabled) {
            return;
        }
        const metadata = node.userData.metadata;

        let helper = node.userData.obb;

        if (node.visible && metadata.boundingVolume) {
            if (!helper) {
                // 3dtiles with region
                if (metadata.boundingVolume.region) {
                    helper = new OBBHelper(metadata.boundingVolume.region, `id:${node.id}`);
                    regionBoundingBoxParent.add(helper);
                    helper.updateMatrixWorld(true);
                // 3dtiles with box
                } else if (metadata.boundingVolume.box) {
                    bboxMesh.geometry.boundingBox = metadata.boundingVolume.box;
                    helper = new THREE.BoxHelper(bboxMesh);
                    helper.material.linewidth = 2;
                // 3dtiles with Sphere
                } else if (metadata.boundingVolume.sphere) {
                    const geometry = new THREE.SphereGeometry(metadata.boundingVolume.sphere.radius, 32, 32);
                    const material = new THREE.MeshBasicMaterial({ wireframe: true });
                    helper = new THREE.Mesh(geometry, material);
                    helper.position.copy(metadata.boundingVolume.sphere.center);
                }

                if (helper) {
                    helper.layer = layer;
                    // add the ability to hide all the debug obj for one layer at once
                    const l3js = layer.threejsLayer;
                    helper.layers.set(l3js);
                    if (helper.children.length) {
                        helper.children[0].layers.set(l3js);
                    }
                    node.userData.obb = helper;
                    helper.updateMatrixWorld();
                }

                if (helper && !metadata.boundingVolume.region) {
                    // compensate B3dm orientation correction
                    const gltfUpAxis = _3dTileslayer.tileset.asset.gltfUpAxis;
                    if (gltfUpAxis === undefined || gltfUpAxis === 'Y') {
                        helper.rotation.x = -Math.PI * 0.5;
                    } else if (gltfUpAxis === 'X') {
                        helper.rotation.z = -Math.PI * 0.5;
                    }

                    // Add helper to parent to apply the correct transformation
                    node.parent.add(helper);
                    helper.updateMatrix();
                    helper.updateMatrixWorld(true);
                }
            }

            if (helper) {
                helper.visible = true;
                if (typeof helper.setMaterialVisibility === 'function') {
                    helper.setMaterialVisibility(true);
                }
            }
        } else if (helper) {
            helper.visible = false;
            if (typeof helper.setMaterialVisibility === 'function') {
                helper.setMaterialVisibility(false);
            }
        }
    }

    const obbLayer = new GeometryLayer(obb_layer_id, new THREE.Object3D(), {
        update: debugIdUpdate,
        visible: false,
        cacheLifeTime: Infinity,
    });

    View.prototype.addLayer.call(view, obbLayer, _3dTileslayer).then((l) => {
        gui.add(l, 'visible').name('Bounding boxes').onChange(() => {
            view.notifyChange(view.camera.camera3D);
        });
    });

    // The sse Threshold for each tile
    gui.add(_3dTileslayer, 'sseThreshold', 0, 100).name('sseThreshold').onChange(() => {
        view.notifyChange(view.camera.camera3D);
    });
}
