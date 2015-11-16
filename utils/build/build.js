({
    paths : {
       
        'text'          : "ThirdParty/text",
        'THREE'         : "ThirdParty/three.min",
        'PriorityQueue' : "ThirdParty/PriorityQueue",
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
        PriorityQueue: {            
            exports: 'PriorityQueue'
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
    out: "../../build/itowns.js",
    removeCombined: false
})