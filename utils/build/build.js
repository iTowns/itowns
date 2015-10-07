({
    paths : {
        
        'THREE' : "https://rawgit.com/mrdoob/three.js/master/build/three.min"  ,        
        'OrbitControls' : "Renderer/Three/OrbitControls",
        'StarGeometry' : "Renderer/ThreeExtented/StarGeometry"
    },

     shim: {
        
        THREE: {            
            exports: 'THREE'
        },
        OrbitControls: {
            deps: ['THREE']
        },
        StarGeometry: {
            deps: ['THREE']
        }

    },
    

    baseUrl : "../../src",
    name: "Main",
    out: "../../build/itowns.js",
    removeCombined: false
})