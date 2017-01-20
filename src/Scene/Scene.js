/**
 * Generated On: 2015-10-5
 * Class: Scene
 * Description: La Scene est l'instance principale du client. Elle est le chef orchestre de l'application.
 */

/* global window, requestAnimationFrame */

import CustomEvent from 'custom-event';
import c3DEngine from '../Renderer/c3DEngine';
import Scheduler from '../Core/Commander/Scheduler';
import CoordStars from '../Core/Geographic/CoordStars';
import StyleManager from './Description/StyleManager';
import Camera from '../Renderer/Camera';

var instanceScene = null;


const RENDERING_PAUSED = 0;
const RENDERING_ACTIVE = 1;

/**
 * Constructs an Itowns Scene instance
 *
 * @param {string} crs - The default CRS of Three.js coordinates. Should be a cartesian CRS.
 * @param {Coordinates} positionCamera - The initial position of the camera
 * @param {DOMElement} viewerDiv - Where to instanciate the Three.js scene in the DOM
 * @param {boolean} debugMode - activate debug mode
 * @param {boolean} glDebug - debug gl code
 * @constructor
 */
 /* TODO:
 * - remove debug boolean, replace by if __DEBUG__ and checkboxes in debug UI
 * - Scene (and subobjects) should be instanciable several times.
 */
function Scene(crs, positionCamera, viewerDiv, debugMode, gLDebug) {
    if (instanceScene !== null) {
        throw new Error('Cannot instantiate more than one Scene');
    }
    this.referenceCrs = crs;

    this.camera = new Camera(
        viewerDiv.clientWidth * (debugMode ? 0.5 : 1.0),
        viewerDiv.clientHeight,
        debugMode);
    this.camera.setPosition(positionCamera.as(crs).xyz());

    this.cameras = null;
    this.selectNodes = null;
    this.scheduler = Scheduler(this);
    this.orbitOn = false;

    this.stylesManager = new StyleManager();

    this.gLDebug = gLDebug;

    this.gfxEngine = c3DEngine(this, viewerDiv, debugMode, gLDebug);

    this.needsRedraw = false;
    this.lastRenderTime = 0;
    this.maxFramePerSec = 60;

    this.time = 0;
    this.orbitOn = false;
    this.rAF = null;

    this.viewerDiv = viewerDiv;
    this.renderingState = RENDERING_PAUSED;

    this._geometryLayers = [];

    this.nextThreejsLayer = 0;
}

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

Scene.prototype.size = function size() {
    return this._size;
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
        if (__DEBUG__) {
            document.title += ' ⌛';
        }

        requestAnimationFrame(() => { this.step(); });
    }
};

Scene.prototype.addGeometryLayer = function addGeometryLayer(layer) {
    if (typeof (layer.update) !== 'function') {
        throw new Error('Cant add GeometryLayer: missing a update function');
    }
    if (typeof (layer.preUpdate) !== 'function') {
        throw new Error('Cant add GeometryLayer: missing a preUpdate function');
    }
    this._geometryLayers.push(layer);
};

Scene.prototype.getAttachedLayers = function getAttachedLayers(filter) {
    const result = [];
    for (const geometryLayer of this._geometryLayers) {
        for (const attached of geometryLayer._attachedLayers) {
            if (!filter || filter(attached, geometryLayer)) {
                result.push(attached);
            }
        }
    }
    return result;
};

function updateElements(context, geometryLayer, elements) {
    if (!elements) {
        return;
    }
    for (const element of elements) {
        // update element
        const newElementsToUpdate = geometryLayer.update(context, geometryLayer, element);

        // update attached layers
        for (const attachedLayer of geometryLayer._attachedLayers) {
            attachedLayer.update(context, attachedLayer, element);
        }
        updateElements(context, geometryLayer, newElementsToUpdate);
    }
}

Scene.prototype.update = function update() {
    const context = {
        camera: this.camera,
        scheduler: this.scheduler,
        scene: this,
    };

    for (const geometryLayer of this._geometryLayers) {
        const elementsToUpdate = geometryLayer.preUpdate(context, geometryLayer);
        updateElements(context, geometryLayer, elementsToUpdate);
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

        if (__DEBUG__) {
            document.title = document.title.substr(0, document.title.length - 2);
        }
    } else {
        const ts = Date.now();

        // update rendering
        if ((1000.0 / this.maxFramePerSec) < (ts - this.lastRenderTime)) {
            // only perform rendering if needed
            if (this.needsRedraw) {
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
    // browse three.js scene, and mark selected node
    this.gfxEngine.scene3D.traverse((node) => {
        // only take of selectable nodes
        if (node.setSelected) {
            node.setSelected(node.id === id);

            if (node.id === id) {
                // eslint-disable-next-line no-console
                console.info(node);
            }
        }
    });
};

Scene.prototype.updateMaterialUniform = function updateMaterialUniform(uniformName, value) {
    this.gfxEngine.scene3D.traverse((obj) => {
        if (!obj.material || !obj.material.uniforms) {
            return;
        }
        if (uniformName in obj.material.uniforms) {
            obj.material.uniforms[uniformName].value = value;
        }
    });
};

// Should be moved in time module: A single loop update registered object every n millisec
Scene.prototype.animateTime = function animateTime(value) {
    if (value) {
        this.time += 4000;

        if (this.time) {
            var nMilliSeconds = this.time;
            var coSun = CoordStars.getSunPositionInScene(new Date().getTime() + 3.6 * nMilliSeconds, 0, 0);
            this.lightingPos = coSun;
            this.updateMaterialUniform('lightPosition', this.lightingPos.clone().normalize());
            this.layers[0].node.updateLightingPos(this.lightingPos);
            if (this.orbitOn) { // ISS orbit is 0.0667 degree per second -> every 60th of sec: 0.00111;
                var p = this.camera.camera3D.position;
                var r = Math.sqrt(p.z * p.z + p.x * p.x);
                var alpha = Math.atan2(p.z, p.x) + 0.0001;
                p.x = r * Math.cos(alpha);
                p.z = r * Math.sin(alpha);
            }

            this.gfxEngine.update();
            // this.gfxEngine.renderScene();
        }
        this.rAF = requestAnimationFrame(this.animateTime.bind(this));
    } else
        { window.cancelAnimationFrame(this.rAF); }
};

Scene.prototype.orbit = function orbit(value) {
    // this.gfxEngine.controls = null;
    this.orbitOn = value;
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

export default function (crs, positionCamera, viewerDiv, debugMode, gLDebug) {
    instanceScene = instanceScene || new Scene(crs, positionCamera, viewerDiv, debugMode, gLDebug);
    return instanceScene;
}
