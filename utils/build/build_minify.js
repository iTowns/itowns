({
    paths : {
       
        'text'          : "ThirdParty/text",
        'THREE'         : "https://rawgit.com/mrdoob/three.js/master/build/three.min",
        'when'          : 'ThirdParty/when',        
        'OrbitControls' : "Renderer/Three/OrbitControls",
        'StarGeometry'  : "Renderer/ThreeExtented/StarGeometry",
        'OBB'           : "Renderer/ThreeExtented/OBB",
        'OBBHelper'     : "Renderer/ThreeExtented/OBBHelper"
        
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
        when: {            
            exports: 'when'
        },
        OrbitControls: {
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
        }

    },

    baseUrl : "../../src",
    name: "Main",
    out: "../../build/itowns_minify.js",
    removeCombined: false
})