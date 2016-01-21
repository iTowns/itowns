/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* global requirejs */


requirejs.config({
    baseUrl: 'src/',
    paths : {
       
        'text'          : "ThirdParty/text",
        'THREE'         : "https://rawgit.com/mrdoob/three.js/master/build/three.min",
        'PriorityQueue' : "ThirdParty/PriorityQueue",
        'when'          : 'ThirdParty/when',        
        'OrbitControls' : "Renderer/Three/OrbitControls",
        'FlyControls'   : "Renderer/Three/FlyControls",
        'StarGeometry'  : "Renderer/ThreeExtented/StarGeometry",
        'OBB'           : "Renderer/ThreeExtented/OBB",
        'OBBHelper'     : "Renderer/ThreeExtented/OBBHelper",
        'JSZip'         : "Renderer/ThreeExtented/jszip.min",
        'ColladaLoader' : "Renderer/ThreeExtented/ColladaLoader"        
    },
  /*
    bundles: {
        'primary': ['main', 'text']
    },	
  */
	
    shim: {
        
        THREE: {            
            exports: 'THREE'
        },
        JSZip: {            
            exports: 'JSZip'
        },        
        PriorityQueue: {            
            exports: 'PriorityQueue'
        },
        when: {            
            exports: 'when'
        },
        OrbitControls: {
            deps: ['THREE']
        },        
        FlyControls: {
            deps: ['THREE']
        },
        StarGeometry: {
            deps: ['THREE']
        },
        OBB: {
            deps: ['THREE']
        },        
        OBBHelper: {
            deps: ['THREE']
        },
        ColladaLoader: {
            deps: ['THREE']
        }
    },
    
    waitSeconds : 30
});


requirejs(['Core/Commander/Interfaces/ApiInterface/ApiGlobe'], 
    function(ApiGlobe) 
    {
       
        ApiGlobe.CreateSceneGlobe();
        
    }
);
