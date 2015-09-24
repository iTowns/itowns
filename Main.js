requirejs.config({
    baseUrl: 'src/',
    paths : {
        'geoportail' : "http://api.ign.fr/geoportail/api/js/2.0.3/Geoportal",
        'jquery'     : "http://ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min",
        'when'       : "lib/when", //there is a prob of dependences if we use when.js on github
        'THREE'	     : "https://rawgit.com/mrdoob/three.js/master/build/three.min",
	'OrbitControls' : "https://rawgit.com/mrdoob/three.js/master/examples/js/controls/OrbitControls",
	'Detector'   : "https://rawgit.com/mrdoob/three.js/master/examples/js/Detector"
    },
	/**
		for other extention of three, the config is here
		https://github.com/mrdoob/three.js/issues/3883
	*/
	
	shim: {
                THREE: {
                    exports: 'THREE'
                },
                OrbitControls: {
                    deps: ['THREE']
                },
                Detector: {
                    exports: 'Detector'
                },

    },
    waitSeconds : 30
});


requirejs(['gfx/GFX',
           'OrbitControls'], 
    function(GFX) 
    {
        
		var gfx = new GFX();
                gfx.start();
        
    });