import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';
import View from 'Core/View';
import GeometryLayer from 'Layer/GeometryLayer';
import { MAIN_LOOP_EVENTS } from 'Core/MainLoop';
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

let selectedNode;
/**
 * Select tile
 *
 * @param      {View} view
 * @param      {Object} mouseOrEvt - mouse position in window coordinates (0, 0 = top-left)
 * or MouseEvent or TouchEvent.
 * @param      {boolean}  [showInfo=true] Show tile information in console.
 * @return     {TileMesh} Selected tile.
 */
function selectTileAt(view, mouseOrEvt, showInfo = true) {
    if (selectedNode) {
        selectedNode.material.overlayAlpha = 0;
        selectedNode.material.showOutline = view.tileLayer.showOutline;
        view.notifyChange(selectedNode);
    }

    const picked = view.tileLayer.pickObjectsAt(view, mouseOrEvt);
    selectedNode = picked.length ? picked[0].object : undefined;

    if (selectedNode) {
        if (showInfo) {
            // eslint-disable-next-line no-console
            console.info(selectedNode);
        }
        selectedNode.material.overlayAlpha = 0.5;
        selectedNode.material.showOutline = true;
        view.notifyChange(selectedNode);
    }
    return selectedNode;
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

        const helpers = node.children.filter(n => n.layer == layer);

        if (node.material && node.material.visible) {
            let helper;
            if (helpers.length == 0) {
                // add the ability to hide all the debug obj for one layer at once
                const l = context.view.getLayerById(layer.id);
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
                                    } else if (Array.isArray(c.material)) {
                                        for (const material of c.material) {
                                            material.dispose();
                                        }
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

    const obbLayer = new GeometryLayer(obb_layer_id, new THREE.Object3D(), {
        update: debugIdUpdate,
        visible: false,
    });

    View.prototype.addLayer.call(view, obbLayer, layer).then((l) => {
        gui.add(l, 'visible').name('Bounding boxes').onChange(() => {
            view.notifyChange(l);
        });
    });

    const sbLayer = new GeometryLayer(sb_layer_id, new THREE.Object3D(), {
        update: debugIdUpdate,
        visible: false,
    });

    View.prototype.addLayer.call(view, sbLayer, layer).then((l) => {
        gui.add(l, 'visible').name('Bounding Spheres').onChange(() => {
            view.notifyChange(l);
        });
    });


    const viewerDiv = document.getElementById('viewerDiv');
    const circle = document.createElement('span');
    circle.className = 'circleBase';

    viewerDiv.appendChild(circle);

    const centerNode = new THREE.Vector3();
    let actualNode;

    const animationFrameRequester = () => {
        TWEEN.update();
        view.notifyChange();
    };

    const removeAnimationRequester = () => {
        TWEEN.removeAll();
        if (view._frameRequesters[MAIN_LOOP_EVENTS.BEFORE_RENDER].includes(animationFrameRequester)) {
            view.removeFrameRequester(MAIN_LOOP_EVENTS.BEFORE_RENDER, animationFrameRequester);
        }
    };

    function picking(event) {
        const selectNode = selectTileAt(view, event, false);
        if (selectNode) {
            circle.style.display = 'table-cell';
            centerNode.copy(selectNode.boundingSphere.center).applyMatrix4(selectNode.matrixWorld);
            const project = centerNode.project(view.camera.camera3D);
            const coords = view.normalizedToViewCoords(project);
            const size = selectNode.screenSize;

            if (actualNode != selectNode) {
                const actualSize = Number(circle.style.width.replace('px', ''));
                actualNode = selectNode;
                removeAnimationRequester();
                new TWEEN.Tween({ size: actualSize })
                    .to({ size }, 500)
                    .easing(TWEEN.Easing.Sinusoidal.In)
                    .easing(TWEEN.Easing.Exponential.Out)
                    .onUpdate((object) => {
                        circle.style['line-height'] = `${object.size}px`;
                        circle.style.width = `${object.size}px`;
                        circle.style.height = `${object.size}px`;
                        circle.innerHTML = `${Math.floor(object.size)} px`;
                        circle.style.left = `${coords.x - object.size  * 0.5}px`;
                        circle.style.top = `${coords.y - object.size * 0.5}px`;
                    })
                    .onComplete(removeAnimationRequester)
                    .start();

                view.addFrameRequester(MAIN_LOOP_EVENTS.BEFORE_RENDER, animationFrameRequester);
            }
        } else {
            circle.style.display = 'none';
        }
    }

    gui.add(state, 'sseHelper').name('Sse helper').onChange((v) => {
        if (v) {
            window.addEventListener('mousemove', picking, false);
        } else {
            circle.style.display = 'none';
            removeAnimationRequester();
            window.removeEventListener('mousemove', picking);
        }
    });
    let currKey = null;

    window.addEventListener('mousedown', (event) => {
        if (currKey == 83) {
            selectTileAt(view, event);
        }
    });

    window.addEventListener('keydown', (event) => {
        currKey = event.which;
    });
    window.addEventListener('keyup', () => {
        currKey = null;
    });
}
