import * as THREE from 'three';
import View from 'Core/View';
import Layer from 'Layer/Layer';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';
import TileObjectChart from './charts/TileObjectChart';
import TileVisibilityChart from './charts/TileVisibilityChart';
import GeometryDebug from './GeometryDebug';
import OBBHelper from './OBBHelper';

function applyToNodeFirstMaterial(view, root, layer, cb) {
    root.traverse((object) => {
        if (object.material && object.layer === layer) {
            cb(object.material);
        }
    });
    view.notifyChange();
}

export default function createTileDebugUI(datDebugTool, view, layer, debugInstance) {
    const gui = GeometryDebug.createGeometryDebugUI(datDebugTool, view, layer);

    const objectChardId = `${layer.id}-nb-objects`;
    debugInstance.createChartContainer(objectChardId);
    const visibleChardId = `${layer.id}-nb-visible`;
    debugInstance.createChartContainer(visibleChardId);

    debugInstance.charts.push(new TileObjectChart(objectChardId, layer));
    debugInstance.charts.push(new TileVisibilityChart(visibleChardId, layer));

    layer.showOutline = false;
    layer.wireframe = false;
    const state = {
        objectChart: true,
        visibilityChart: true,
        sseHelper: false,
    };

    // tiles outline
    gui.add(layer, 'showOutline').name('Show tiles').onChange((newValue) => {
        layer.showOutline = newValue;

        applyToNodeFirstMaterial(view, layer.object3d, layer, (material) => {
            material.showOutline = newValue;
        });
    });

    // tiles wireframe
    gui.add(layer, 'wireframe').name('Wireframe').onChange(() => {
        view.notifyChange(layer);
    });

    // TileObjectChart visibility
    gui.add(state, 'objectChart').name('Object chart').onChange((newValue) => {
        if (newValue) {
            document.getElementById(objectChardId).parentNode.style.display = 'block';
        } else {
            document.getElementById(objectChardId).parentNode.style.display = 'none';
        }
        debugInstance.updateChartDivSize();
        debugInstance.charts.forEach(c => c.update());
    });

    // TileVisibilityChart visibility
    gui.add(state, 'visibilityChart').name('Visibility chart').onChange((newValue) => {
        if (newValue) {
            document.getElementById(visibleChardId).parentNode.style.display = 'block';
        } else {
            document.getElementById(visibleChardId).parentNode.style.display = 'none';
        }
        debugInstance.updateChartDivSize();
        debugInstance.charts.forEach(c => c.update());
    });

    // Bounding box control
    const obb_layer_id = `${layer.id}_obb_debug`;
    const sb_layer_id = `${layer.id}_sb_debug`;
    const geometrySphere = new THREE.SphereGeometry(1, 16, 16);

    function debugIdUpdate(context, layer, node) {
        const enabled = context.camera.camera3D.layers.test({ mask: 1 << layer.threejsLayer });

        if (!node.parent || !enabled) {
            ObjectRemovalHelper.removeChildrenAndCleanupRecursively(layer.id, node);
            return;
        }

        if (!enabled) {
            return;
        }
        const helpers = node.children.filter(n => n.layer == layer);

        if (node.material && node.material.visible) {
            let helper;
            if (helpers.length == 0) {
                // add the ability to hide all the debug obj for one layer at once
                const l = context.view.getLayers(l => l.id === layer.id)[0];
                const l3js = l.threejsLayer;

                if (layer.id == obb_layer_id) {
                    helper = new OBBHelper(node.obb, `id:${node.id}`);
                    if (helper.children[0]) {
                        helper.children[0].layers.set(l3js);
                    }
                } else if (layer.id == sb_layer_id) {
                    const color = new THREE.Color(Math.random(), Math.random(), Math.random());
                    const material = new THREE.MeshBasicMaterial({ color: color.getHex(), wireframe: true });
                    helper = new THREE.Mesh(geometrySphere, material);
                    helper.position.copy(node.boundingSphere.center);
                    helper.scale.multiplyScalar(node.boundingSphere.radius);
                }

                helper.layers.set(l3js);
                helper.layer = layer;
                node.add(helper);
                helper.updateMatrixWorld(true);

                // if we don't do that, our OBBHelper will never get removed,
                // because once a node is invisible, children are not removed
                // any more
                // FIXME a proper way of notifying tile deletion to children layers should be implemented
                const descriptor = Object.getOwnPropertyDescriptor(node.material, 'visible');
                const getVisible = descriptor.get || (() => descriptor.value);
                const setVisible = descriptor.set || ((value) => { descriptor.value = value; });
                Object.defineProperty(node.material, 'visible', {
                    get: getVisible,
                    set: (value) => {
                        setVisible(value);
                        if (!value) {
                            let i = node.children.length;
                            while (i--) {
                                const c = node.children[i];
                                if (c.layer === sb_layer_id) {
                                    if (c.dispose) {
                                        c.dispose();
                                    } else {
                                        c.material.dispose();
                                    }
                                    node.children.splice(i, 1);
                                }
                            }
                        }
                    },
                });
            } else {
                helper = helpers[0];
            }
            if (layer.id == obb_layer_id) {
                helper.setMaterialVisibility(true);
                helper.update(node.obb);
            } else if (layer.id == sb_layer_id) {
                helper.position.copy(node.boundingSphere.center);
                helper.scale.multiplyScalar(node.boundingSphere.radius);
            }
        } else {
            // hide obb children
            for (const child of node.children.filter(n => n.layer == layer.id)) {
                if (typeof child.setMaterialVisibility === 'function') {
                    child.setMaterialVisibility(false);
                }
                child.visible = false;
            }
        }
    }

    const obbLayer = new Layer(obb_layer_id, 'debug', {
        update: debugIdUpdate,
        visible: false,
    });

    View.prototype.addLayer.call(view, obbLayer, layer).then((l) => {
        gui.add(l, 'visible').name('Bounding boxes').onChange(() => {
            view.notifyChange(l);
        });
    });

    const sbLayer = new Layer(sb_layer_id, 'debug', {
        update: debugIdUpdate,
        visible: false,
    });

    View.prototype.addLayer.call(view, sbLayer, layer).then((l) => {
        gui.add(l, 'visible').name('Bounding Spheres').onChange(() => {
            view.notifyChange(l);
        });
    });

    const circle = document.getElementById('circle');
    const centerNode = new THREE.Vector3();
    function picking(event) {
        const selectNode = view.selectNodeAt(event, false);
        if (selectNode) {
            circle.style.display = 'table-cell';
            centerNode.copy(selectNode.boundingSphere.center).applyMatrix4(selectNode.matrixWorld);
            const project = centerNode.project(view.camera.camera3D);
            const coords = view.normalizedToViewCoords(project);
            const size = selectNode.px;

            circle.style['line-height'] = `${size}px`;
            circle.style.width = `${size}px`;
            circle.style.height = `${size}px`;
            circle.style.left = `${coords.x - size  * 0.5}px`;
            circle.style.top = `${coords.y - size * 0.5}px`;
            circle.innerHTML = `${Math.floor(size)} px`;
        } else {
            circle.style.display = 'none';
        }
    }

    gui.add(state, 'sseHelper').name('Sse helper').onChange((v) => {
        if (v) {
            window.addEventListener('mousemove', picking, false);
        } else {
            window.removeEventListener('mousemove', picking);
        }
    });
}
