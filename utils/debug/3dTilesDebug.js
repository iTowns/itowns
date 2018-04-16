import * as THREE from 'three';
import OBBHelper from './OBBHelper';
import View from '../../src/Core/View';
import GeometryDebug from './GeometryDebug';

export default function create3dTilesDebugUI(datDebugTool, view, layer) {
    const gui = GeometryDebug.createGeometryDebugUI(datDebugTool, view, layer);

    // add wireframe
    GeometryDebug.addWireFrameCheckbox(gui, view, layer);

    // Bounding box control
    const obb_layer_id = `${layer.id}_obb_debug`;

    const debugIdUpdate = function debugIdUpdate(context, layer, node) {
        const enabled = context.camera.camera3D.layers.test({ mask: 1 << layer.threejsLayer });

        if (!enabled) {
            return;
        }
        var obbChildren = node.children.filter(n => n.layer == layer);

        if (node.visible && node.boundingVolume) {
            // 3dTiles case
            let helper;
            if (obbChildren.length == 0) {
                // 3dtiles with region
                if (node.boundingVolume.region) {
                    helper = new OBBHelper(node.boundingVolume.region, `id:${node.id}`);
                    helper.position.copy(node.boundingVolume.region.position);
                    helper.rotation.copy(node.boundingVolume.region.rotation);
                    node.add(helper);
                    helper.layer = layer;
                    // add the ability to hide all the debug obj for one layer at once
                    const l = context.view.getLayers(l => l.id === obb_layer_id)[0];
                    const l3js = l.threejsLayer;
                    helper.layers.set(l3js);
                    helper.children[0].layers.set(l3js);
                    helper.updateMatrixWorld();
                }
                // 3dtiles with box
                if (node.boundingVolume.box) {
                    const size = node.boundingVolume.box.getSize();
                    const g = new THREE.BoxGeometry(size.x, size.y, size.z);
                    const material = new THREE.MeshBasicMaterial({ wireframe: true });
                    helper = new THREE.Mesh(g, material);
                    node.boundingVolume.box.getCenter(helper.position);
                    node.add(helper);
                    helper.layer = layer;
                    // add the ability to hide all the debug obj for one layer at once
                    const l = context.view.getLayers(l => l.id === obb_layer_id)[0];
                    const l3js = l.threejsLayer;
                    helper.layers.set(l3js);
                    helper.updateMatrixWorld();
                }
                // 3dtiles with Sphere
                if (node.boundingVolume.sphere) {
                    const geometry = new THREE.SphereGeometry(node.boundingVolume.sphere.radius, 32, 32);
                    const material = new THREE.MeshBasicMaterial({ wireframe: true });
                    helper = new THREE.Mesh(geometry, material);
                    helper.position.copy(node.boundingVolume.sphere.center);
                    node.add(helper);
                    helper.layer = layer;
                    // add the ability to hide all the debug obj for one layer at once
                    const l = context.view.getLayers(l => l.id === obb_layer_id)[0];
                    const l3js = l.threejsLayer;
                    helper.layers.set(l3js);
                    helper.updateMatrixWorld();
                }
            } else {
                helper = obbChildren[0];
            }
            if (helper) {
                helper.visible = true;
                for (const child of node.children.filter(n => n.layer == layer)) {
                    if (typeof child.setMaterialVisibility === 'function') {
                        child.setMaterialVisibility(true);
                    }
                    child.visible = true;
                }
            }
        } else {
            // hide obb children
            for (const child of node.children.filter(n => n.layer == layer)) {
                if (typeof child.setMaterialVisibility === 'function') {
                    child.setMaterialVisibility(false);
                }
                child.visible = false;
            }
        }
    };

    View.prototype.addLayer.call(view,
        {
            id: obb_layer_id,
            type: 'debug',
            update: debugIdUpdate,
            visible: false,
        }, layer).then((l) => {
            gui.add(l, 'visible').name('Bounding boxes').onChange(() => {
                view.notifyChange(true);
            });
        });

    // The sse Threshold for each tile
    gui.add(layer, 'sseThreshold', 0, 100).name('sseThreshold').onChange(() => {
        view.notifyChange(true);
    });
}
