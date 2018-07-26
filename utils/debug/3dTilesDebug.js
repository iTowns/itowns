import * as THREE from 'three';
import OBBHelper from './OBBHelper';
import View from '../../src/Core/View';
import GeometryDebug from './GeometryDebug';

const invMatrixChangeUpVectorZtoY = new THREE.Matrix4().getInverse(new THREE.Matrix4().makeRotationX(Math.PI / 2));
const invMatrixChangeUpVectorZtoX = new THREE.Matrix4().getInverse(new THREE.Matrix4().makeRotationZ(-Math.PI / 2));

export default function create3dTilesDebugUI(datDebugTool, view, _3dTileslayer) {
    const gui = GeometryDebug.createGeometryDebugUI(datDebugTool, view, _3dTileslayer);

    const regionBoundingBoxParent = new THREE.Group();
    view.scene.add(regionBoundingBoxParent);

    // add wireframe
    GeometryDebug.addWireFrameCheckbox(gui, view, _3dTileslayer);

    // Bounding box control
    const obb_layer_id = `${_3dTileslayer.id}_obb_debug`;

    const debugIdUpdate = function debugIdUpdate(context, layer, node) {
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
                    helper.position.copy(metadata.boundingVolume.region.position);
                    helper.rotation.copy(metadata.boundingVolume.region.rotation);
                    regionBoundingBoxParent.add(helper);
                }
                // 3dtiles with box
                if (metadata.boundingVolume.box) {
                    const size = new THREE.Vector3();
                    metadata.boundingVolume.box.getSize(size);
                    const g = new THREE.BoxGeometry(size.x, size.y, size.z);
                    const material = new THREE.MeshBasicMaterial({ wireframe: true });
                    helper = new THREE.Mesh(g, material);
                    metadata.boundingVolume.box.getCenter(helper.position);
                }
                // 3dtiles with Sphere
                if (metadata.boundingVolume.sphere) {
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
                    const gltfUpAxis = _3dTileslayer.asset.gltfUpAxis;
                    helper.updateMatrix();
                    if (gltfUpAxis === undefined || gltfUpAxis === 'Y') {
                        helper.matrix.premultiply(invMatrixChangeUpVectorZtoY);
                    } else if (gltfUpAxis === 'X') {
                        helper.matrix.premultiply(invMatrixChangeUpVectorZtoX);
                    }
                    helper.applyMatrix(new THREE.Matrix4());

                    node.add(helper);
                    helper.updateMatrixWorld();
                }
            } else {
                helper = node.userData.obb;
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
    };

    View.prototype.addLayer.call(view,
        {
            id: obb_layer_id,
            type: 'debug',
            update: debugIdUpdate,
            visible: false,
        }, _3dTileslayer).then((l) => {
            gui.add(l, 'visible').name('Bounding boxes').onChange(() => {
                view.notifyChange();
            });
        });

    // The sse Threshold for each tile
    gui.add(_3dTileslayer, 'sseThreshold', 0, 100).name('sseThreshold').onChange(() => {
        view.notifyChange();
    });
}
