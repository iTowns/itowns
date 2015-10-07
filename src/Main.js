/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* global requirejs */


requirejs.config({
    baseUrl: 'src/',
    paths : {
       
        'THREE'         : "https://rawgit.com/mrdoob/three.js/master/build/three.min"  ,
        'when'          : 'ThirdParty/when',
        'OrbitControls' : "Renderer/Three/OrbitControls",
        'StarGeometry'  : "Renderer/ThreeExtented/StarGeometry"
    },
	
	
    shim: {
        
        THREE: {            
            exports: 'THREE'
        },
        when: {            
            exports: 'when'
        },
        OrbitControls: {
            deps: ['THREE']
        },
        StarGeometry: {
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
