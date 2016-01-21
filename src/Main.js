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
        //'THREE'         : "https://rawgit.com/mrdoob/three.js/master/build/three.min",
        'THREE'         : "https://rawgit.com/mrdoob/three.js/dev/build/three.min",
        'PriorityQueue' : "ThirdParty/PriorityQueue",
        'when'          : 'ThirdParty/when',
        'parallel'      : 'ThirdParty/parallel',        
        'OrbitControls' : "Renderer/Three/OrbitControls",
        'GlobeControls' : "Renderer/ThreeExtented/GlobeControls",
        'FlyControls'   : "Renderer/Three/FlyControls",
        'FontUtils'     : "Renderer/Three/FontUtils",
        'FontOptimer'   : "Renderer/Three/optimer_regular",
        'StarGeometry'  : "Renderer/ThreeExtented/StarGeometry",
        'OBB'           : "Renderer/ThreeExtented/OBB",
        'OBBHelper'     : "Renderer/ThreeExtented/OBBHelper",
        'JSZip'         : "Renderer/ThreeExtented/jszip.min",
        'ColladaLoader' : "Renderer/ThreeExtented/ColladaLoader",        
        'SphereHelper'  : "Renderer/ThreeExtented/SphereHelper"
        
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
        parallel: {            
            deps: ['when']
        },
        OrbitControls: {
            deps: ['THREE']
        },
        GlobeControls: {
            deps: ['THREE']
        },   
        FlyControls: {
            deps: ['THREE']
        },
        FontUtils: {
            deps: ['THREE']
        },
        FontOptimer: {
            deps: ['THREE']
        },
        StarGeometry: {
            deps: ['THREE']
        },
        OBB: {
            deps: ['THREE']
        },        
        OBBHelper: {
            deps: ['THREE','FontUtils','FontOptimer']
        },        
        SphereHelper: {
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
