/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* global requirejs */


requirejs.config({
    baseUrl: 'src/',
    paths : {
       
        'THREE' : "https://rawgit.com/mrdoob/three.js/master/build/three.min"       
    },
	
	
    shim: {
        
        THREE: {
            exports: 'THREE'
        }

    },
    
    waitSeconds : 30
});


requirejs(['Renderer/NodeMesh'], 
    function(NodeMesh) 
    {
                      
        var node = new NodeMesh();
        
        console.log("Node = ", node);// true
        
    }
);
