/**
 * Generated On: 2015-10-5
 * Class: Scene
 * Description: La Scene est l'instance principale du client. Elle est le chef orchestre de l'application.
 */

/* global window, requestAnimationFrame */

import c3DEngine from 'Renderer/c3DEngine';
import Scheduler from 'Core/Commander/Scheduler';
import CustomEvent from 'custom-event';
import StyleManager from 'Scene/Description/StyleManager';
import LayersConfiguration from 'Scene/LayersConfiguration';
import Camera from 'Renderer/Camera';
import WMTS_Provider from 'Core/Commander/Providers/WMTS_Provider';
import WMS_Provider from 'Core/Commander/Providers/WMS_Provider';
import WFS_Provider from 'Core/Commander/Providers/WFS_Provider';
import TileProvider from 'Core/Commander/Providers/TileProvider';
import { STRATEGY_MIN_NETWORK_TRAFFIC } from 'Scene/LayerUpdateStrategy';


var instanceScene = null;


const RENDERING_PAUSED = 0;
const RENDERING_ACTIVE = 1;

function Scene(viewerDiv, debugMode, gLDebug) {
    if (instanceScene !== null) {
        throw new Error('Cannot instantiate more than one Scene');
    }

    this.camera = new Camera(
        viewerDiv.clientWidth * (debugMode ? 0.5 : 1.0),
        viewerDiv.clientHeight,
        debugMode);


    this.selectNodes = null;
    this.scheduler = Scheduler(this);
    this.orbitOn = false;

    this.stylesManager = new StyleManager();

    this.gLDebug = gLDebug;
    this.gfxEngine = c3DEngine(this, viewerDiv, debugMode, gLDebug);

    this.needsRedraw = false;
    this.lastRenderTime = 0;
    this.maxFramePerSec = 60;

    this.orbitOn = false;
    this.rAF = null;

    this.viewerDiv = viewerDiv;
    this.renderingState = RENDERING_PAUSED;
    this.layersConfiguration = new LayersConfiguration();

    this.nextThreejsLayer = 0;

    // default dummy controls
    this.controls = {
        updateCameraTransformation: function updateCameraTransformation() {},
        moveTarget: function moveTarget() {},
        updateCamera: function updateCamera() {},
    };
}

Scene.prototype.constructor = Scene;


Scene.prototype.initDefaultProviders = function initDefaultProviders() {
    var gLDebug = false; // true to support GLInspector addon

    // Register all providers
    var wmtsProvider = new WMTS_Provider({
        support: gLDebug,
    });

    this.scheduler.addProtocolProvider('wmts', wmtsProvider);
    this.scheduler.addProtocolProvider('wmtsc', wmtsProvider);
    this.scheduler.addProtocolProvider('tile', new TileProvider());
    this.scheduler.addProtocolProvider('wms', new WMS_Provider({ support: gLDebug }));
    this.scheduler.addProtocolProvider('wfs', new WFS_Provider());
};


/**
 * This function gives a chance to the matching provider to pre-process some
 * values for a layer.
 */
function preprocessLayer(scene, layer, provider) {
    if (!layer.updateStrategy) {
        layer.updateStrategy = {
            type: STRATEGY_MIN_NETWORK_TRAFFIC,
        };
    }

    if (!provider) {
        return;
    }

    if (provider.tileInsideLimit) {
        layer.tileInsideLimit = provider.tileInsideLimit.bind(provider);
    }

    if (provider.tileTextureCount) {
        layer.tileTextureCount = provider.tileTextureCount.bind(provider);
    }

    if (provider.preprocessDataLayer) {
        provider.preprocessDataLayer(layer);
    }

    // probably not the best place to do this
    if (provider instanceof WFS_Provider || provider instanceof TileProvider) {
        const threejsLayer = scene.getUniqueThreejsLayer();
        scene.layersConfiguration.setLayerAttribute(layer.id, 'threejsLayer', threejsLayer);
        // enable by default
        scene.camera.camera3D.layers.enable(threejsLayer);
    } else {
        scene.layersConfiguration.setLayerAttribute(layer.id, 'frozen', false);
        scene.layersConfiguration.setLayerAttribute(layer.id, 'visible', true);
        scene.layersConfiguration.setLayerAttribute(layer.id, 'opacity', 1.0);
        scene.layersConfiguration.setLayerAttribute(layer.id, 'sequence', 0);
    }
}

Scene.prototype.addLayer = function addLayer(layer, parentLayerId) {
    this.layersConfiguration.addLayer(layer, parentLayerId);
    preprocessLayer(this, layer, this.scheduler.getProtocolProvider(layer.protocol));
};

/**
 * @documentation: return current camera
 * @returns {Scene_L7.Scene.gfxEngine.camera}
 */
Scene.prototype.currentCamera = function currentCamera() {
    return this.camera;
};

Scene.prototype.currentControls = function currentControls() {
    return this.controls;
};

Scene.prototype.getPickPosition = function getPickPosition(mouse) {
    return this.gfxEngine.getPickingPositionFromDepth(mouse);
};

Scene.prototype.getStyle = function getStyle(name) {
    return this.stylesManager.getStyle(name);
};

Scene.prototype.removeStyle = function removeStyle(name) {
    return this.stylesManager.removeStyle(name);
};

Scene.prototype.getStyles = function getStyles() {
    return this.stylesManager.getStyles();
};

/**
 *
 * @returns {undefined}
 */
Scene.prototype.updateScene3D = function updateScene3D() {
    this.gfxEngine.update();
};


/**
 * Notifies the scene it needs to be updated due to changes exterior to the
 * scene itself (e.g. camera movement).
 * Using a non-0 delay allows to delay update - useful to reduce CPU load for
 * non-interactive events (e.g: texture loaded)
 * needsRedraw param indicates if notified change requires a full scene redraw.
 */
Scene.prototype.notifyChange = function notifyChange(delay, needsRedraw) {
    if (delay) {
        window.setTimeout(() => { this.scheduleUpdate(needsRedraw); }, delay);
    } else {
        this.scheduleUpdate(needsRedraw);
    }
};

Scene.prototype.scheduleUpdate = function scheduleUpdate(forceRedraw) {
    this.needsRedraw |= forceRedraw;

    if (this.renderingState !== RENDERING_ACTIVE) {
        this.renderingState = RENDERING_ACTIVE;

        requestAnimationFrame(() => { this.step(); });
    }
};


function updateElement(context, layer, element, childrenStages) {
    const elements = layer.update(context, layer, element);

    if (elements) {
        for (const element of elements) {
            for (const s of childrenStages) {
                updateElement(context, s.layer, element, s.grafted);
            }
        }
    }
}

Scene.prototype.update = function update() {
    this.camera.updateMatrixWorld();

    // Browse Layer tree
    const config = this.layersConfiguration;

    // TODO?
    const context = {
        camera: this.camera,
        scheduler: this.scheduler,
        scene: this,
    };


    // call pre-update on all layers
    config.traverseLayers((layer) => {
        if (layer.preUpdate) {
            layer.preUpdate(context, layer);
        }
    });

    // update layers
    for (const stage of config.stages) {
        const elements = [];
        const layer = stage.layer;
        // level 0 layers get a first element-less call
        layer.update(context, layer).forEach(e => elements.push(e));

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];

            // update this element
            const newElements = layer.update(context, layer, element);

            for (const s of stage.children) {
                updateElement(context, s.layer, element, s.children);
            }

            // append elements to update queue
            if (newElements) {
                newElements.forEach(e => elements.push(e));
            }
        }
    }
};

Scene.prototype.step = function step() {
    // update data-structure
    this.update();

    // Check if we're done (no command left).
    // We need to make sure we didn't executed any commands because these commands
    // might spawn other commands in a next update turn.
    const executedDuringUpdate = this.scheduler.resetCommandsCount('executed');
    if (this.scheduler.commandsWaitingExecutionCount() == 0 && executedDuringUpdate == 0) {
        this.viewerDiv.dispatchEvent(new CustomEvent('globe-built'));

        // one last rendering before pausing
        this.renderScene3D();

        // reset rendering flag
        this.renderingState = RENDERING_PAUSED;
    } else {
        const ts = Date.now();

        // update rendering
        if ((1000.0 / this.maxFramePerSec) < (ts - this.lastRenderTime)) {
            // only perform rendering if needed
            if (this.needsRedraw || executedDuringUpdate > 0) {
                this.renderScene3D();
                this.lastRenderTime = ts;
            }
        }

        requestAnimationFrame(() => { this.step(); });
    }
};

/**
 */
Scene.prototype.renderScene3D = function renderScene3D() {
    this.gfxEngine.renderScene();
    this.needsRedraw = false;
};

Scene.prototype.scene3D = function scene3D() {
    return this.gfxEngine.scene3D;
};

Scene.prototype.selectNodeId = function selectNodeId(id) {
    console.log('SELECT NODE ID', id);
    // browse three.js scene, and mark selected node
    this.gfxEngine.scene3D.traverse((node) => {
        // only take of selectable nodes
        node.selected = node.id === id;
        if (node.setSelected) {
            node.setSelected(node.id === id);
        }
    });
};

Scene.prototype.getUniqueThreejsLayer = function getUniqueThreejsLayer() {
    // We use three.js Object3D.layers feature to manage visibility of
    // geometry layers; so we need an internal counter to assign a new
    // one to each new geometry layer.
    // Warning: only 32 ([0, 31]) different layers can exist.
    if (this.nextThreejsLayer > 31) {
        // eslint-disable-next-line no-console
        console.warn('Too much three.js layers. Starting from now all of them will use layerMask = 31');
        this.nextThreejsLayer = 31;
    }

    const result = this.nextThreejsLayer++;

    return result;
};

export default Scene;
