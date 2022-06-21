import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';
import View from 'Core/View';
import GeometryLayer from 'Layer/GeometryLayer';
import { MAIN_LOOP_EVENTS } from 'Core/MainLoop';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';
import LayerUpdateState from 'Layer/LayerUpdateState';
import TileObjectChart from './charts/TileObjectChart';
import TileVisibilityChart from './charts/TileVisibilityChart';
import GeometryDebug from './GeometryDebug';
import Debug from './Debug';
import OBBHelper from './OBBHelper';


const quaternion = new THREE.Quaternion();


function preUpdate() {
    this.object3d.clear();
}


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

export default function createTileDebugUI(datDebugTool, view, layer, debugInstance, force = false) {
    if (!view.isDebugMode && !force) {
        return;
    }
    debugInstance = debugInstance || new Debug(view, datDebugTool);
    layer = layer || view.tileLayer;
    const gui = GeometryDebug.createGeometryDebugUI(datDebugTool, view, layer);

    const objectChardId = `${layer.id}-nb-objects`;
    const canvasObjectChardId = debugInstance.createChartContainer(objectChardId);
    const visibleChardId = `${layer.id}-nb-visible`;
    const canvasVisibleChardId = debugInstance.createChartContainer(visibleChardId);

    debugInstance.charts.push(new TileObjectChart(canvasObjectChardId.getContext('2d'), layer));
    debugInstance.charts.push(new TileVisibilityChart(canvasVisibleChardId.getContext('2d'), layer));

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
        if (!node.parent) {
            ObjectRemovalHelper.removeChildrenAndCleanupRecursively(layer, node);
            return;
        }

        if (!node.visible || !node.material.visible) {
            return;
        }

        if (node.layerUpdateState[layer.id] === undefined) {
            node.layerUpdateState[layer.id] = new LayerUpdateState();
        } else if (!node.layerUpdateState[layer.id].canTryUpdate()) {
            node.link.forEach((f) => {
                if (f.layer?.id === layer.id) {
                    f.layer.object3d.add(f);
                    f.updateMatrixWorld(true);
                }
            });
            return;
        }

        const extentDestination = node.getExtentsByProjection(node.extent.crs) || [node.extent];

        node.layerUpdateState[layer.id].newTry();

        const command = {
            layer,
            extentsSource: extentDestination,
            view: context.view,
            requester: node,
            options: {
                node,
            },
        };

        return context.scheduler.execute(command).then((helperArray) => {
            node.layerUpdateState[layer.id].noMoreUpdatePossible();
            const helper = helperArray[0];

            helper.layer = layer;

            layer.object3d.add(helper);
            node.link.push(helper);

            helper.updateMatrixWorld(true);
        });
    }

    const obbLayer = new GeometryLayer(obb_layer_id, new THREE.Object3D(), {
        update: debugIdUpdate,
        convert: (from, to, options) => new OBBHelper(options.node.obb),
        visible: true,
        cacheLifeTime: Infinity,
        source: false,
    });
    obbLayer.source.urlFromExtent = () => {};
    obbLayer.source.fetcher = () => Promise.resolve({});

    obbLayer.preUpdate = preUpdate.bind(obbLayer);

    View.prototype.addLayer.call(view, obbLayer, layer).then((l) => {
        gui.add(l, 'visible').name('Bounding boxes').onChange(() => {
            view.notifyChange(l);
        });
    });

    const sbLayer = new GeometryLayer(sb_layer_id, new THREE.Object3D(), {
        update: debugIdUpdate,
        convert: (from, to, options) => {
            const color = new THREE.Color(Math.random(), Math.random(), Math.random());
            const material = new THREE.MeshBasicMaterial({ color: color.getHex(), wireframe: true });
            const helper = new THREE.Mesh(geometrySphere, material);

            options.node.getWorldPosition(helper.position);
            helper.position.add(
                options.node.boundingSphere.center.applyQuaternion(options.node.getWorldQuaternion(quaternion)),
            );
            // helper.position.copy(options.node.boundingSphere.center);
            helper.scale.multiplyScalar(options.node.boundingSphere.radius);
            return helper;
        },
        visible: false,
        cacheLifeTime: Infinity,
        source: false,
    });
    sbLayer.source.urlFromExtent = () => {};
    sbLayer.source.fetcher = () => Promise.resolve({});

    sbLayer.preUpdate = preUpdate.bind(sbLayer);

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
