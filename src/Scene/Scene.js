/**
 * Generated On: 2015-10-5
 * Class: Scene
 * Description: La Scene est l'instance principale du client. Elle est le chef orchestre de l'application.
 */

/**
 *
 * @param {type} c3DEngine
 * @param {type} Globe
 * @param {type} ManagerCommands
 * @param {type} BrowseTree
 * @returns {Function}
 */
import c3DEngine from 'Renderer/c3DEngine';
import Globe from 'Globe/Globe';
import ManagerCommands from 'Core/Commander/ManagerCommands';
import BrowseTree from 'Scene/BrowseTree';
import NodeProcess from 'Scene/NodeProcess';
import Quadtree from 'Scene/Quadtree';
import CoordStars from 'Core/Geographic/CoordStars';
import GeoCoordinate,{UNIT} from 'Core/Geographic/GeoCoordinate';
import defaultValue from 'Core/defaultValue';
import Layer from 'Scene/Layer';
import Capabilities from 'Core/System/Capabilities';
import MobileMappingLayer from 'MobileMapping/MobileMappingLayer';
import CustomEvent from 'custom-event';
import * as THREE from 'THREE';
import volcanoFS from 'Renderer/Shader/VolcanoFS.glsl';
import volcanoVS from 'Renderer/Shader/VolcanoVS.glsl';
import particleFS from 'Renderer/Shader/ParticleFS.glsl';
import particleVS from 'Renderer/Shader/ParticleVS.glsl';

var instanceScene = null;
var event = new CustomEvent('globe-built');
var NO_SUBDIVISE = 0;
var SUBDIVISE = 1;
var CLEAN = 2;

function Scene(coordinate, ellipsoid, viewerDiv, debugMode, gLDebug) {

    if (instanceScene !== null) {
        throw new Error("Cannot instantiate more than one Scene");
    }

    this.ellipsoid = ellipsoid;

    var positionCamera = this.ellipsoid.cartographicToCartesian(coordinate);

    this.layers = [];
    this.map = null;

    this.cameras = null;
    this.selectNodes = null;
    this.managerCommand = ManagerCommands(this);
    this.orbitOn = false;

    this.gLDebug = gLDebug;
    this.gfxEngine = c3DEngine(this,positionCamera,viewerDiv, debugMode,gLDebug);
    this.browserScene = new BrowseTree(this.gfxEngine);
    this.cap = new Capabilities();

    this.time = 0;
    this.orbitOn = false;
    this.rAF = null;
    this.elevationEffect = false;
    this.heightMapEffect = false;
    this.sunEffect = false;
    this.fogEffect = false;
    this.hideSea = false;
    this.slideOn = false;
    this.volcanoMesh = null;
    this.particles = null;

    this.viewerDiv = viewerDiv;
}

Scene.prototype.constructor = Scene;
/**
 */
Scene.prototype.updateCommand = function() {
    //TODO: Implement Me

};

/**
 * @documentation: return current camera
 * @returns {Scene_L7.Scene.gfxEngine.camera}
 */
Scene.prototype.currentCamera = function() {
    return this.gfxEngine.camera;
};

Scene.prototype.currentControls = function() {
    return this.gfxEngine.controls;
};

Scene.prototype.getPickPosition = function(mouse) {
    return this.gfxEngine.getPickingPositionFromDepth(mouse);
};

Scene.prototype.getEllipsoid = function() {
    return this.ellipsoid;
};

//    Scene.prototype.getZoomLevel = function(){
//        return this.selectNodes;
//    };

Scene.prototype.size = function() {
    return this.ellipsoid.size;
};

/**
 *
 * @returns {undefined}
 */
Scene.prototype.quadTreeRequest = function(quadtree, process) {

    this.browserScene.browse(quadtree, this.currentCamera(), process, this.map.layersConfiguration, SUBDIVISE);
    this.managerCommand.runAllCommands().then(function() {
        if (this.managerCommand.isFree()) {
            this.browserScene.browse(quadtree, this.currentCamera(), process, this.map.layersConfiguration, SUBDIVISE);
            if (this.managerCommand.isFree()) {
                this.browserScene.browse(quadtree, this.currentCamera(), process, this.map.layersConfiguration, CLEAN)
                this.viewerDiv.dispatchEvent(event);

            }
        }

    }.bind(this));

    this.renderScene3D();

};

Scene.prototype.realtimeSceneProcess = function() {

    for (var l = 0; l < this.layers.length; l++) {
        var layer = this.layers[l].node;
        var process = this.layers[l].process;

        for (var sl = 0; sl < layer.children.length; sl++) {
            var sLayer = layer.children[sl];

            if (sLayer instanceof Quadtree)
                this.browserScene.browse(sLayer, this.currentCamera(), process, this.map.layersConfiguration, NO_SUBDIVISE);
            else if (sLayer instanceof MobileMappingLayer)
                this.browserScene.updateMobileMappingLayer(sLayer, this.currentCamera());
            else if (sLayer instanceof Layer)
                this.browserScene.updateLayer(sLayer, this.currentCamera());

        }
    }
};

/**
 *
 * @returns {undefined}
 */
Scene.prototype.updateScene3D = function() {

    this.gfxEngine.update();
};

Scene.prototype.wait = function(timeWait) {

    var waitTime = timeWait ? timeWait : 20;

    this.realtimeSceneProcess();

    window.clearInterval(this.timer);

    this.timer = window.setTimeout(this.quadTreeRequest.bind(this), waitTime, this.layers[0].node.tiles, this.layers[0].process);
};

/**
 */
Scene.prototype.renderScene3D = function() {

    this.gfxEngine.renderScene();

};

Scene.prototype.scene3D = function() {

    return this.gfxEngine.scene3D;
};

/**
 * @documentation: Ajoute des Layers dans la scène.
 *
 * @param node {[object Object]}
 */
Scene.prototype.add = function(node, nodeProcess) {

    if (node instanceof Globe) {
        this.map = node;
        nodeProcess = nodeProcess || new NodeProcess(this.currentCamera(), node.ellipsoid);
        //this.quadTreeRequest(node.tiles, nodeProcess);

    }

    this.layers.push({
        node: node,
        process: nodeProcess
    });
    this.gfxEngine.add3DScene(node.getMesh());
};

Scene.prototype.getMap = function() {
    return this.map;
};

/**
 * @documentation: Retire des layers de la scène
 *
 * @param layer {[object Object]}
 */
Scene.prototype.remove = function( /*layer*/ ) {
    //TODO: Implement Me

};


/**
 * @param layers {[object Object]}
 */
Scene.prototype.select = function( /*layers*/ ) {
    //TODO: Implement Me

};

Scene.prototype.selectNodeId = function(id) {

    this.browserScene.selectedNodeId = id;

};

Scene.prototype.setStreetLevelImageryOn = function(value) {

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

Scene.prototype.setLightingPos = function(pos) {

    if (pos)
        this.lightingPos = pos;
    else {
        var coSun = CoordStars.getSunPositionInScene(this.getEllipsoid(), new Date().getTime(), 48.85, 2.35);
        this.lightingPos = coSun;
    }

    defaultValue.lightingPos = this.lightingPos;

    this.browserScene.updateMaterialUniform("lightPosition", this.lightingPos.clone().normalize());
    this.layers[0].node.updateLightingPos(this.lightingPos);
};

// Should be moved in time module: A single loop update registered object every n millisec
Scene.prototype.animateTime = function(value) {

    if (value) {
        this.time += 4000;

        if (this.time) {

            var nMilliSeconds = this.time;
            var coSun = CoordStars.getSunPositionInScene(this.getEllipsoid(), new Date().getTime() + 3.6 * nMilliSeconds, 0, 0);
            this.lightingPos = coSun;
            this.browserScene.updateMaterialUniform("lightPosition", this.lightingPos.clone().normalize());
          
            
            // TEMP georoom ****************************************************
            this.browserScene.updateMaterialUniform("time", this.time /1000);
            var posCartCenterIsland = new THREE.Vector3(3370247.4958533593, -2284640.7292576847, -4912345.35489408);
            var i = this.time /400000;
            var dist = 20000;
            var x = Math.cos(i) * dist;
            var y = Math.sin(i) * dist;
            var z = 0;
            // Then apply rotation using posCartCenterIsland normal
            var newPos = posCartCenterIsland.clone().add(new THREE.Vector3(x,y,z));
            this.browserScene.updateMaterialUniform("sunPosition", newPos);
    
            if (this.volcanoMesh != null)
                  this.volcanoMesh.material.uniforms[ 'time' ].value = .00000020 * this.time;//.00025 * ( Date.now() - start );)
              

	    if(this.particles != null){
                this.particles.material.uniforms[ 'time' ].value =  this.time / 4000;
            }
            // *****************************************************************
            
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
        window.cancelAnimationFrame(this.rAF);
};


Scene.prototype.getElevationEffect = function(){
    
    return this.elevationEffect;
};

Scene.prototype.setElevationEffect = function(b){
    
    if(b === null )
        this.elevationEffect = !this.elevationEffect;
    else 
        this.elevationEffect = b;

    this.browserScene.updateMaterialUniform("elevationEffectOn", this.elevationEffect ? 1. : 0.);
    this.renderScene3D();
};

Scene.prototype.setHeightMapEffect = function(b){
    
    if(b === null )
        this.heightMapEffect = !this.heightMapEffect;
    else 
        this.heightMapEffect = b;

    this.browserScene.updateMaterialUniform("heightMapEffectOn", this.heightMapEffect ? 1. : 0.);
    this.renderScene3D();
};


Scene.prototype.setHideSeaOn = function(b){
    
    if(b === null )
        this.hideSea = !this.hideSea;
    else 
        this.hideSea = b;

    this.browserScene.updateMaterialUniform("hideSea", this.hideSea ? 1. : 0.);
    this.renderScene3D();
};


Scene.prototype.setFogEffect = function(b){
    
    if(b === null )
        this.fogEffect = !this.fogEffect;
    else 
        this.fogEffect = b;

    this.browserScene.updateMaterialUniform("fogEffectOn", this.fogEffect ? 1. : 0.);
    this.renderScene3D();
};


Scene.prototype.setSunPosition = function(b){
    
    if(b === null )
        this.sunEffect = !this.sunEffect;
    else 
        this.sunEffect = b;

    this.browserScene.updateMaterialUniform("sunOn", this.sunEffect ? 1 : 0);
 
    //var sphere = new THREE.Mesh((new THREE.SphereGeometry(500, 8, 8)), new THREE.MeshBasicMaterial({depthWrite: false, depthTest: false}));
    //this.gfxEngine.add3DScene(sphere);
    // sphere.position.copy(new THREE.Vector3(3370386.310755235, -2285365.632290666, -4904477.750950122));
    // Reunion center: lon/lat 55.546875/-21.110765
    var posCartCenterIsland = this.ellipsoid.cartographicToCartesian(new GeoCoordinate(55.546875, -21.110765, 5000, UNIT.DEGREE));
 //   console.log(posCartCenterIsland);
 //   sphere.position.copy(posCartCenterIsland);
    this.browserScene.updateMaterialUniform("sunPosition", posCartCenterIsland);
    
    this.renderScene3D();
};

Scene.prototype.slide = function(b) {
    
    if(b === null )
        this.slideOn = !this.slideOn;
    else 
        this.slideOn = b;
    this.browserScene.updateMaterialUniform("slide", this.slideOn ? 1 : 0);
    this.renderScene3D();
};

Scene.prototype.setVolcanoOn = function(b) {
    
    if(this.volcanoMesh === null ){

        var textureLoader = new THREE.TextureLoader();

        var materialVolcano = new THREE.ShaderMaterial( {

            uniforms: { 
                tExplosion: { 
                  type: "t", 
                  value: textureLoader.load( 'data/textures/volcano/explosion.png' )
                },
               time: { 
                  type: "f", 
                  value: 0.0 
                }
            },

            vertexShader: volcanoVS,
            fragmentShader: volcanoFS,

            // depthTest: false,
            // depthWrite: false,

        } );


        this.volcanoMesh = new THREE.Mesh( 
                new THREE.IcosahedronGeometry( 1000, 4 ), 
                materialVolcano 
        );
        materialVolcano.uniforms.tExplosion.needsUpdate = true;
        var posCartCenterIsland = this.ellipsoid.cartographicToCartesian(new GeoCoordinate(  55.714073, -21.243862, 2224, UNIT.DEGREE)); //55.546875, -21.110765
        this.volcanoMesh.position.copy(posCartCenterIsland);
        this.volcanoMesh.scale.set(2,2,2);
        this.gfxEngine.add3DScene(this.volcanoMesh);
        this.setSmokeParticle(posCartCenterIsland);
        this.renderScene3D();
    }
    else
        this.volcanoMesh.visible = ! this.volcanoMesh.visible;

};


Scene.prototype.setSmokeParticle = function(p){
    
     var p = this.ellipsoid.cartographicToCartesian(new GeoCoordinate(  55.703516, -21.243862, 4224, UNIT.DEGREE)); // 55.714073, -21.243862
     var normalSmoke = p.clone().normalize();
     var dist = 10;
     var addedDist = normalSmoke.clone().multiplyScalar(dist);
     console.log(addedDist, addedDist.x + dist* Math.random());
     /*
        var camPos = this.gfxEngine.getCamera().position().clone();
        var vecDir = camPos.clone().sub(p.clone()).normalize();
        var pos = camPos.clone().sub(vecDir.multiplyScalar(dist));
        console.log(camPos, pos);
    */
    
    var uniforms = {
            time:      { value: 0.},
            color:     { value: new THREE.Color( 0xffffff ) },
            texture:   { value: new THREE.TextureLoader().load( "data/textures/particles/smoke3.png" ) }//perlin-512.png" ) }//smoke_PNG965.png" ) }
    };
    var shaderMaterial = new THREE.ShaderMaterial( {
            uniforms:       uniforms,
            vertexShader:   particleVS,
            fragmentShader: particleFS,
         //   blending:       THREE.AdditiveBlending,
       //     depthTest:      false,
            depthWrite:     false,
            transparent:    true
    });

    var particles = 10000;
    var radius = 5;
    var geometry = new THREE.BufferGeometry();
    var positions = new Float32Array( particles * 3 );
    var colors = new Float32Array( particles * 3 );
    var sizes = new Float32Array( particles );
    var maxD = new Float32Array( particles );
    var color = new THREE.Color();
    for ( var i = 0, i3 = 0; i < particles; i ++, i3 += 3 ) {
            positions[ i3 + 0 ] = Math.random()* radius;//( Math.random() * 2 - 1 ) * radius;
            positions[ i3 + 1 ] = Math.random()* radius;//( Math.random() * 2 - 1 ) * radius ;
            positions[ i3 + 2 ] = Math.random()* radius;//( Math.random() * 2 - 1 ) * radius;
            //color.setHSL( i / particles, 1.0, 0.5 );
            colors[ i3 + 0 ] = addedDist.x + dist* Math.random();//positions[ i3 + 0 ]  + addedDist;
            colors[ i3 + 1 ] = addedDist.y + dist* Math.random();//positions[ i3 + 1 ]  + addedDist;
            colors[ i3 + 2 ] = addedDist.z + dist* Math.random();//positions[ i3 + 2 ]  + addedDist;
            sizes[ i ] = 40000;
            maxD[ i ] = 4000 * Math.random();
    }
    geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.addAttribute( 'customColor', new THREE.BufferAttribute( colors, 3 ) );
    geometry.addAttribute( 'size', new THREE.BufferAttribute( sizes, 1 ) );
    geometry.addAttribute( 'maxDist', new THREE.BufferAttribute( maxD, 1 ) );
    
    this.particles = new THREE.Points( geometry, shaderMaterial );

    var p = this.ellipsoid.cartographicToCartesian(new GeoCoordinate(  55.69, -21.24, 4224, UNIT.DEGREE)); //55.546875, -21.110765
    this.particles.position.copy(p);
    this.gfxEngine.add3DScene(this.particles);   
    /*
    this.particles.frustumCulled = false;
    this.particles.geometry.computeBoundingSphere();
    this.particles.geometry.computeBoundingBox();
    this.particles.renderOrder = -15;
    this.gfxEngine.add3DScene(this.particles);     
    this.particles.renderOrder = -15;
    */
        
        // We need to bring particles close to camera for nice rendering
        // Compute position in front of cam in direction of volcano
 /*       var dist = 800;
        var camPos = this.gfxEngine.getCamera().position().clone();
        
        var vecDir = camPos.clone().sub(p.clone()).normalize();
        var pos = camPos.clone().sub(vecDir.multiplyScalar(dist));
        console.log(camPos, pos);
        this.particles.position.copy(pos);
   */     
                        
};

Scene.prototype.orbit = function(value) {

    //this.gfxEngine.controls = null;
    this.orbitOn = value;
};




export default function(coordinate, ellipsoid, viewerDiv, debugMode, gLDebug) {
    instanceScene = instanceScene || new Scene(coordinate, ellipsoid, viewerDiv, debugMode, gLDebug);
    return instanceScene;
}
