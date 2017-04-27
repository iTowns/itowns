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
import vectorSimulationVS from '../Renderer/Shader/vectorSimulationVS.glsl';
import vectorSimulationFS from '../Renderer/Shader/vectorSimulationFS.glsl';
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
    
    //****** Vector Fields dirty tests
    this.particlesField = null;
    this.timing = 0.;
    this._orthoCamera = null;
    this._scene = null;
    this._renderer = null;
    this._rtt = null;
    this.simulationMesh = null;
    // ARF
    this.width = 1024;
    this.height = 1024;
    this.arrayRTT = new Float32Array( this.width * this.height * 4 );
    this.dataTexture = null;
    this.originalVectorsTexture = null;
    
    this.fbTexture1 = null;
    this.fbTexture2 = null;
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

var radius = 6450000;
// Return angular coord from angular 3D cartesian coordinates  (spheric estimation)
// coord lon lat  (x is lon , y is lat)
function get3DPosFromCoord(coord){

   var c = new THREE.Vector2( -coord.x , coord.y);
   var x = radius * Math.cos(c.x) * Math.sin(c.y);
   var y = radius * Math.cos(c.y);
   var z = radius * Math.sin(c.x) * Math.sin(c.y);

   return new THREE.Vector3(x,y,z); 
};

function getOneDegreeRepartition( width, height, size ){

    var len = width * height * 4;
    var data = new Float32Array( len );
    //   while( len-- )  data[len] = ( Math.random() * 2 - 1 ) * size ;     
    var altitude = 8000;
    for(var a=0; a< len ; a+=4) {
        
        var posCartesian = get3DPosFromCoord(new THREE.Vector2( Math.random() * 2 * Math.PI, Math.random() * Math.PI) );
        
          //  var posWGS84 = new Coordinates('EPSG:4326', 180 - Math.random() * 360, 90 - Math.random() * 180, altitude);//arrayLines.length, 90- arrayVectorFields.length, altitude);
          //  var posCartesian = posWGS84.as('EPSG:4978').xyz();
        
        // Version basic spheric
          
        data[a + 0] = posCartesian.x;
        data[a + 1] = posCartesian.y;
        data[a + 2] = posCartesian.z;
        data[a + 3] = 1.;
    } 
    return data;
 };

// Create a texture equirectangular from grib data.
// Each Pixel will have Ucomponent, Vcomponent and speed.
Scene.prototype.createGribTexture = function orbit(data) {
    
    console.log(data);
    var meteoArray = [];
    var Ucomponent = data[0];
    var Vcomponent = data[1];
    var speed = 0.;
    var nbX = Ucomponent.header.nx;
    var nbY = Ucomponent.header.ny;
   
    var nbParticles = Ucomponent.header.numberPoints;
    var len = nbParticles * 4;
    var dataVF = new Float32Array( len );
  
    for(var i = 0; i< nbParticles; ++i){
        var inc = i*4;
        dataVF[inc + 0] = Ucomponent.data[i + 0];
        dataVF[inc + 1] = Vcomponent.data[i + 0];
        dataVF[inc + 2] = Math.sqrt(Ucomponent.data[i + 0] * Ucomponent.data[i + 0] + Vcomponent.data[i + 0] * Vcomponent.data[i + 0]); // speed
        dataVF[inc + 3] = 1.;  // bonus value
    }
   
  /*
    // FOR DEBUG JUST GO RIGHT
    for(var i = 0; i< nbParticles; ++i){
        var inc = i*4;
        dataVF[inc + 0] = 0.;
        dataVF[inc + 1] = -10.;
        dataVF[inc + 2] = 0.; // speed
        dataVF[inc + 3] = 1.;  // bonus value
    }
 */   
     // convertes it to a FloatTexture 
     console.log(nbX, nbY);
     this.drawVectorsAsArrows(data);
     //    this.drawVectorsAsArrowsEllipsoidal(data);
     
    return new THREE.DataTexture( dataVF, nbX, nbY, THREE.RGBAFormat, THREE.FloatType ); 
}


// Test function to display grib data 
Scene.prototype.displayGrib = function orbit(data) {
    
    this.originalVectorsTexture = this.createGribTexture(data);
    this.originalVectorsTexture.needsUpdate = true;
    console.log("this.originalVectorsTexture", this.originalVectorsTexture);
    
    var bgeometry = new THREE.BufferGeometry();
  //  var width  = 512;
  //  var height = 512;
    this._scene = new THREE.Scene();
    this._orthoCamera = new THREE.OrthographicCamera(-1,1,1,-1, 1/Math.pow( 2, 53 ),1);

    this._renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, autoClear : false, alpha:true} );
    this._renderer.autoClear = false;
    this._renderer.setSize(this.width, this.height);
    this._renderer.setPixelRatio( window.devicePixelRatio );

    // Original position of particules. (random as a start)
    var data = getOneDegreeRepartition( this.width, this.height, 256 );
    // convertes it to a FloatTexture
    var textureVecPositions = new THREE.DataTexture( data, this.width, this.height, THREE.RGBAFormat, THREE.FloatType );
    textureVecPositions.needsUpdate = true;
    this.fixedPositionsTexture = new THREE.DataTexture( data.slice(0), this.width, this.height, THREE.RGBAFormat, THREE.FloatType );
    this.fixedPositionsTexture.needsUpdate = true;
    console.log(textureVecPositions);
    
    //create a target texture
    var options = {
        minFilter: THREE.NearestFilter,//important as we want to sample square pixels
        magFilter: THREE.NearestFilter,//
        format: THREE.RGBAFormat,//could be RGBAFormat 
        type: THREE.FloatType,//important as we need precise coordinates (not ints)
        generateMipmaps: false
    };
    this._rtt = new THREE.WebGLRenderTarget( this.width, this.height, options);
    
    // Particle life in second... Should be done with distance travelled in shader but bug..
    var particleLife = new Float32Array(this.width * this.height);
    for ( var i = 0; i < this.width * this.height; i++ ) {
            particleLife[ i ] = Math.random();
    }
    
    //the simulation:
    //create a bi-unit quadrilateral and uses the simulation material to update the Float Texture
    var geom = new THREE.BufferGeometry();
    geom.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array([   -1,-1,0, 1,-1,0, 1,1,0, -1,-1, 0, 1, 1, 0, -1,1,0 ]), 3 ) );
    geom.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array([   0,1, 1,1, 1,0,     0,1, 1,0, 0,0 ]), 2 ) );
    geom.addAttribute( 'particleLife', new THREE.BufferAttribute( particleLife, 1 ) );
    
    
    //simulation shader used to update the particles' positions
    var simulationMaterial = new THREE.ShaderMaterial({
        uniforms:{ 
            timing:    { type: "f", value: this.timing }, 
            positions: { type: "t", value: textureVecPositions }, 
            gribVectors: { type: "t", value: this.originalVectorsTexture }, 
            initPositions: { type: "t", value: this.fixedPositionsTexture } 
        },
        vertexShader:   vectorSimulationVS,
        fragmentShader: vectorSimulationFS,
       // depthWrite: false
    });
    
    this.simulationMesh =  new THREE.Mesh( geom, simulationMaterial );
    this._scene.add( this.simulationMesh );

    this._renderer.render( this._scene, this._orthoCamera, this._rtt, true );  //this.gfxEngine.renderer.
    console.log(this._rtt);
    this._renderer.readRenderTargetPixels( this._rtt, 0, 0, this.width, this.height, this.arrayRTT );
    this.dataTexture = new THREE.DataTexture( this.arrayRTT, this.width, this.height, THREE.RGBAFormat, THREE.FloatType );
    // Should NOT be necessary!!!!
   
    //render shader to display the particles on screen
    //the 'positions' uniform will be set after the FBO.update() call
    var renderMaterial = new THREE.ShaderMaterial( {
        uniforms: {
            positions: { type: "t", value: this.dataTexture},//textureTest}//this._rtt.texture }//this._rtt}//textureTest
            gribVectors: { type: "t", value: this.originalVectorsTexture } 
        },
        vertexShader: vectorFieldVS,   
        fragmentShader: vectorFieldFS,
        transparent: true,
        blending:THREE.AdditiveBlending,
        generateMipmaps: false,
        depthTest:      true
    } );

    // The particles
    // create a vertex buffer of size width * height with normalized coordinates
    var positionsHazard = new Float32Array(this.width * this.height *3);
    for ( var i = 0; i < this.width * this.height; i++ ) {
            var i3 = i * 3;
            positionsHazard[ i3 ] = ( i % this.width ) / this.width ;
            positionsHazard[ i3 + 1 ] = ( i / this.width ) / this.height;
    }
    

    bgeometry.addAttribute( 'position', new THREE.BufferAttribute( positionsHazard, 3) ); //positions, 3 ) );

    this.particlesField = new THREE.Points( bgeometry, renderMaterial);//shaderMaterial );
    this.particlesField.frustumCulled = false;
    this.particlesField.name = "particlesField";
    //  this.particlesField.material.uniforms.positions.value = this._rtt.texture; // textureVecPositions; 
    this.gfxEngine.add3DScene( this.particlesField );
    //  this.gfxEngine.add3DScene(gribLayer);
    this.animateTiming();
    //this.particlesField.material.uniforms.positions.value.needsUpdate = true;
};


// Ugly to avoid bug, we use a readRenderTargetPixels and then pass it to the uniform as a dataTexture...
Scene.prototype.updateTextureFBO = function(){
    
    //this._renderer.clear();
    this._renderer.render( this._scene, this._orthoCamera, this._rtt, true );
    this._renderer.readRenderTargetPixels( this._rtt, 0, 0, this.width, this.height, this.arrayRTT );
    this.simulationMesh.material.uniforms.positions.value = this.dataTexture;
    this.dataTexture.needsUpdate = true;
}

Scene.prototype.animateTiming = function(){
     
    
    this.timing += 0.001;
    this.simulationMesh.material.uniforms.timing.value = this.timing;
    this.updateTextureFBO();
    this.gfxEngine.update();
    requestAnimationFrame(this.animateTiming.bind(this));
    // this._renderer.render( this._scene, this._orthoCamera, this._rtt, true );
    // this.particlesField.material.uniforms.positions.value = this._rtt.texture;
    // this.gfxEngine.renderer.clear();
};



Scene.prototype.drawVectorsAsArrows = function orbit(data) {
    
    console.log(data);
    var meteoArray = [];
    var Ucomponent = data[0];
    var Vcomponent = data[1];
    var speed = 0.;
    var nbX = Ucomponent.header.nx;
    var nbY = Ucomponent.header.ny;
   
    var nbParticles = Ucomponent.header.numberPoints;
    var len = nbParticles * 4;
    var dataVF = new Float32Array( len );
  
    for(var i = 0; i< nbParticles; ++i){
        
        var inc = i*4;
        dataVF[inc + 0] = Ucomponent.data[i + 0];
        dataVF[inc + 1] = Vcomponent.data[i + 0];
        dataVF[inc + 2] = Math.sqrt(Ucomponent.data[i + 0] * Ucomponent.data[i + 0] + Vcomponent.data[i + 0] * Vcomponent.data[i + 0]); // speed
        dataVF[inc + 3] = 1.;  // bonus value
        
        var x = (i % nbX) / nbX;
        var y = Math.floor(i / nbX) / nbY;
        var posCartesian  = get3DPosFromCoord( new THREE.Vector2( x * 2 * Math.PI, y * Math.PI));
        var posCartesian2 =  get3DPosFromCoord(new THREE.Vector2( (x + Ucomponent.data[i] / 100) * 2 * Math.PI , (y - Vcomponent.data[i] / 100) * Math.PI)); //get3DPosFromCoord( new THREE.Vector2( (x +.1) * Math.PI, (y+.1) * Math.PI));//
        
        var vecDirection = posCartesian2.clone().sub(posCartesian).normalize();
        var magnitude = dataVF[inc + 2];
        var color = new THREE.Color("hsl("+ magnitude *5+", 100%, 50%)");
        
        var arrowHelper = new THREE.ArrowHelper( vecDirection, posCartesian, 100000, color );
        if( !(x > 0.2 && x < 0.8) && y < 0.5 && y > 0.15 ){
            this.gfxEngine.add3DScene(arrowHelper);
        }
    }
   /*
    // FOR DEBUG JUST GO RIGHT
    for(var i = 0; i< nbParticles; ++i){
        var inc = i*4;
        data[inc + 0] = 10.;
        data[inc + 1] = 0.;
        data[inc + 2] = 0.; // speed
        data[inc + 3] = 1.;  // bonus value
    }
    */
     // convertes it to a FloatTexture 
     console.log(nbX, nbY);
     
 //    this.drawVectorsAsArrowsEllipsoidal(data);
     
    return new THREE.DataTexture( dataVF, nbX, nbY, THREE.RGBAFormat, THREE.FloatType ); 
}

Scene.prototype.drawVectorsAsArrowsEllipsoidal = function(data){
    
    var meteoArray = [];
    var arrayLines = [];
    var arrayLinesGeoRef = [];
    var arrayVectorFields = [];
    var arrayVectorFieldsGeoRef = [];
    var Ucomponent = data[0];
    var Vcomponent = data[1];
    var speed = 0.;

    var nbParticles = Ucomponent.header.numberPoints;
    var len = nbParticles * 4;
    var data = new Float32Array( len );
    
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
        
       var arrowHelper = new THREE.ArrowHelper( vecDirection, posCartesian, 100000, new THREE.Color("hsl("+ magnitude *5+", 100%, 50%)") );
       if(i % 16 == 0)
        this.gfxEngine.add3DScene(arrowHelper);
    }
    
};


  /*
   
    bgeometry.addAttribute( 'arrival',  new THREE.BufferAttribute( arrivals, 3 ) );
    bgeometry.addAttribute( 'delay',  new THREE.BufferAttribute( delays, 1 ) );
    bgeometry.addAttribute( 'colorCustom',  new THREE.BufferAttribute( colors, 3 ) );


    
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

*/

export default function (crs, positionCamera, viewerDiv, debugMode, gLDebug) {
    instanceScene = instanceScene || new Scene(crs, positionCamera, viewerDiv, debugMode, gLDebug);
    return instanceScene;
}
