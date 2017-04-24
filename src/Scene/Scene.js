/**
 * Generated On: 2015-10-5
 * Class: Scene
 * Description: La Scene est l'instance principale du client. Elle est le chef orchestre de l'application.
 */

/* global window, requestAnimationFrame */

import CustomEvent from 'custom-event';
import c3DEngine from '../Renderer/c3DEngine';
import Globe from '../Globe/Globe';
import Scheduler from '../Core/Commander/Scheduler';
import BrowseTree from './BrowseTree';
import NodeProcess from './NodeProcess';
import Quadtree from './Quadtree';
import CoordStars from '../Core/Geographic/CoordStars';
import { ellipsoidSizes } from '../Core/Geographic/Coordinates';
import Ellipsoid from '../Core/Math/Ellipsoid';
import Layer from './Layer';
import MobileMappingLayer from '../MobileMapping/MobileMappingLayer';
import StyleManager from './Description/StyleManager';

import * as THREE from 'three'; 
import Coordinates from '../Core/Geographic/Coordinates';
import vectorFieldVS from '../Renderer/Shader/vectorFieldVS.glsl';
import vectorFieldFS from '../Renderer/Shader/vectorFieldFS.glsl';
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

    this.layers = [];
    this.map = null;

    this.cameras = null;
    this.selectNodes = null;
    this.scheduler = Scheduler(this);
    this.orbitOn = false;

    this.stylesManager = new StyleManager();

    this.gLDebug = gLDebug;
    this.gfxEngine = c3DEngine(this, positionCamera.as(crs).xyz(), viewerDiv, debugMode, gLDebug);
    this.browserScene = new BrowseTree(this.gfxEngine);

    this.needsRedraw = false;
    this.lastRenderTime = 0;
    this.maxFramePerSec = 60;

    this.time = 0;
    this.orbitOn = false;
    this.rAF = null;

    this.viewerDiv = viewerDiv;
    this.renderingState = RENDERING_PAUSED;
    
    
    this.particlesField = null;
    this.timing = 0.;
}

Scene.prototype.constructor = Scene;
/**
 */
Scene.prototype.updateCommand = function updateCommand() {
    // TODO: Implement Me

};

/**
 * @documentation: return current camera
 * @returns {Scene_L7.Scene.gfxEngine.camera}
 */
Scene.prototype.currentCamera = function currentCamera() {
    return this.gfxEngine.camera;
};

Scene.prototype.currentControls = function currentControls() {
    return this.gfxEngine.controls;
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

Scene.prototype.getEllipsoid = function getEllipsoid() {
    return this.ellipsoid;
};

Scene.prototype.size = function size() {
    return ellipsoidSizes();
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

Scene.prototype.update = function update() {
    for (var l = 0; l < this.layers.length; l++) {
        var layer = this.layers[l].node;

        for (var sl = 0; sl < layer.children.length; sl++) {
            var sLayer = layer.children[sl];

            if (sLayer instanceof Quadtree) {
                this.browserScene.updateQuadtree(this.layers[l], this.map.layersConfiguration, this.currentCamera());
            } else if (sLayer instanceof MobileMappingLayer) {
                this.browserScene.updateMobileMappingLayer(sLayer, this.currentCamera());
            } else if (sLayer instanceof Layer) {
                this.browserScene.updateLayer(sLayer, this.currentCamera());
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

/**
 * @documentation: Ajoute des Layers dans la scène.
 *
 * @param node {[object Object]}
 */
Scene.prototype.add = function add(node, nodeProcess) {
    if (node instanceof Globe) {
        this.map = node;
        nodeProcess = nodeProcess || new NodeProcess(this);
    }

    this.layers.push({
        node,
        process: nodeProcess,
    });
    this.gfxEngine.add3DScene(node.getMesh());
};

Scene.prototype.getMap = function getMap() {
    return this.map;
};

/**
 * @documentation: Retire des layers de la scène
 *
 * @param layer {[object Object]}
 */
Scene.prototype.remove = function remove(/* layer*/) {
    // TODO: Implement Me

};


/**
 * @param layers {[object Object]}
 */
Scene.prototype.select = function select(/* layers*/) {
    // TODO: Implement Me

};

Scene.prototype.selectNodeId = function selectNodeId(id) {
    this.browserScene.selectedNodeId = id;
};

Scene.prototype.setStreetLevelImageryOn = function setStreetLevelImageryOn(value) {
    if (value) {
        if (this.layers[1]) {
            this.layers[1].node.visible = true;
            this.layers[1].node.children[0].visible = true;
        } else {
            var mobileMappingLayer = new MobileMappingLayer();
            mobileMappingLayer.initiatePanoramic();

            var immersive = new Layer();
            immersive.add(mobileMappingLayer);
            this.add(immersive);
        }
    } else {
        this.layers[1].node.visible = false;
        this.layers[1].node.children[0].visible = false; // mobileMappingLayer
    }

    this.updateScene3D();
};

Scene.prototype.setLightingPos = function setLightingPos(pos) {
    if (pos) {
        this.lightingPos = pos;
    } else {
        const coSun = CoordStars.getSunPositionInScene(new Date().getTime(), 48.85, 2.35);
        this.lightingPos = coSun.normalize();
    }

    this.browserScene.updateMaterialUniform('lightPosition', this.lightingPos.clone().normalize());
    this.layers[0].node.updateLightingPos(this.lightingPos);
};

// Should be moved in time module: A single loop update registered object every n millisec
Scene.prototype.animateTime = function animateTime(value) {
    if (value) {
        this.time += 4000;

        if (this.time) {
            var nMilliSeconds = this.time;
            var coSun = CoordStars.getSunPositionInScene(new Date().getTime() + 3.6 * nMilliSeconds, 0, 0);
            this.lightingPos = coSun;
            this.browserScene.updateMaterialUniform('lightPosition', this.lightingPos.clone().normalize());
            this.layers[0].node.updateLightingPos(this.lightingPos);
            if (this.orbitOn) { // ISS orbit is 0.0667 degree per second -> every 60th of sec: 0.00111;
                var p = this.gfxEngine.camera.camera3D.position;
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




// Test function to display grib data 
Scene.prototype.displayGrib = function orbit(data) {
    
 //   console.log("displayGrib", data);
    var gribLayer = new Layer();
//    this.gfxEngine.add3DScene(gribLayer.getMesh());
 //   console.log(data[0].data.length);
    var meteoArray = [];
    var Ucomponent = data[0];
    var Vcomponent = data[1];
    var speed = 0.;
    var arrayVectorFields = [];
    var arrayLines = [];
    var arrayVectorFieldsGeoRef = [];
    var arrayLinesGeoRef = [];
    //myArr.reduce((rows, key, index) => (index % 3 == 0 ? rows.push([key]) : rows[rows.length-1].push(key)) && rows, []);
    //Ucomponent.header.nx * Ucomponent.header.ny
    var ellipsoid = new Ellipsoid(ellipsoidSizes());
    var particlesGeometry = new THREE.Geometry();
    var particlesMaterial = new THREE.PointsMaterial( { color: 0x888888 } );
    
    
    var	uniforms = {
                    timing : {value:this.timing}
                    //color:     { value: new THREE.Color( 0xffffff ) },
			};

    var bgeometry = new THREE.BufferGeometry();
    var nbParticles = Ucomponent.header.numberPoints;
    var positions = new Float32Array( nbParticles *3);
    var arrivals = new Float32Array( nbParticles *3);
    var colors = new Float32Array( nbParticles *3);
    var delays = new Float32Array( nbParticles *1);
    
    var shaderMaterial = new THREE.ShaderMaterial( {
				uniforms:       uniforms,
				vertexShader:   vectorFieldVS,
				fragmentShader: vectorFieldFS,
				//blending:       THREE.AdditiveBlending,
				//depthTest:      false,
                                transparent:    true
			});

    var inc = 0;
    for(var i = 0; i< nbParticles; ++i){
        
        if(i % (Ucomponent.header.nx ) === 0 && i> 0){ 
            arrayVectorFields.push(arrayLines.slice(0));
            arrayVectorFieldsGeoRef.push(arrayLinesGeoRef.slice(0));
            arrayLines = [];
            arrayLinesGeoRef = [];
        }
        
        var gribCoords = new THREE.Vector3(Ucomponent.data[i], Vcomponent.data[i], speed);
        arrayLines.push(gribCoords);
        var altitude = 200000;
        
       var posWGS84 = new Coordinates('EPSG:4326', arrayLines.length, 90- arrayVectorFields.length, altitude);
       var posCartesian = posWGS84.as('EPSG:4978').xyz();


        // Test avec calcul angulaire de la direction
        var posWGS84_2 = new Coordinates('EPSG:4326', arrayLines.length + gribCoords.x, 90 - arrayVectorFields.length + gribCoords.y, altitude);
        var posCartesian_2 = posWGS84_2.as('EPSG:4978').xyz();

        var vecDirection = posCartesian_2.clone().sub(posCartesian).normalize();
        var magnitude = Math.sqrt(gribCoords.x * gribCoords.x + gribCoords.y * gribCoords.y);
        var color = new THREE.Color("hsl("+ magnitude *5+", 100%, 50%)");
                    
        positions[ inc + 0 ] = posCartesian.x;
        positions[ inc + 1 ] = posCartesian.y;
        positions[ inc + 2 ] = posCartesian.z;
        
        arrivals[ inc + 0 ] = posCartesian_2.x;
        arrivals[ inc + 1 ] = posCartesian_2.y;
        arrivals[ inc + 2 ] = posCartesian_2.z;
        
        colors[ inc + 0 ] = color.r;
        colors[ inc + 1 ] = color.g;
        colors[ inc + 2 ] = color.b;
        
        delays[ inc / 3 ] = Math.random();

    //    var arrowHelper = new THREE.ArrowHelper( vecDirection, posCartesian, 100000, new THREE.Color("hsl("+ magnitude *5+", 100%, 50%)") );
    //    this.gfxEngine.add3DScene(arrowHelper);

        // Particle version old one
        particlesGeometry.vertices.push( posCartesian );
   
        inc +=3;
    }
    /*
    var particlesField = new THREE.Points( particlesGeometry, particlesMaterial );
    this.gfxEngine.add3DScene( particlesField );
    */
       
    bgeometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    bgeometry.addAttribute( 'arrival',  new THREE.BufferAttribute( arrivals, 3 ) );
    bgeometry.addAttribute( 'delay',  new THREE.BufferAttribute( delays, 1 ) );
    bgeometry.addAttribute( 'colorCustom',  new THREE.BufferAttribute( colors, 3 ) );
    
    this.particlesField = new THREE.Points( bgeometry, shaderMaterial );
    this.gfxEngine.add3DScene( this.particlesField );
  //  this.gfxEngine.add3DScene(gribLayer);
  
    this.animateTiming();
   // this.browserScene.updateMaterialUniform('lightPosition', this.lightingPos.clone().normalize());
  //  console.log(arrayVectorFields);
};

Scene.prototype.animateTiming = function(){
    
    requestAnimationFrame(this.animateTiming.bind(this));
    this.timing += 0.001;
    this.particlesField.material.uniforms.timing.value = this.timing;
    this.gfxEngine.update();
};



export default function (crs, positionCamera, viewerDiv, debugMode, gLDebug) {
    instanceScene = instanceScene || new Scene(crs, positionCamera, viewerDiv, debugMode, gLDebug);
    return instanceScene;
}
