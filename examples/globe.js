/* global itowns, document, renderer, setupLoadingScreen */
// Simple Globe viewer

// Define initial camera position
var positionOnGlobe = { longitude: 2.351323, latitude: 48.856712, altitude: 25000000 };
var promises = [];
var miniView;
var minDistance = 10000000;
var maxDistance = 30000000;

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
var viewerDiv = document.getElementById('viewerDiv');
var miniDiv = document.getElementById('miniDiv');

// Instanciate iTowns GlobeView*
var globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, { renderer: renderer });
setupLoadingScreen(viewerDiv, globeView);
function addLayerCb(layer) {
    return globeView.addLayer(layer);
}

// Don't instance mini viewer if it's Test env
if (!renderer) {
    miniView = new itowns.GlobeView(miniDiv, positionOnGlobe, {
        // `limit globe' subdivision level:
        // we're don't need a precise globe model
        // since the mini globe will always be seen from a far point of view (see minDistance above)
        maxSubdivisionLevel: 2,
        // Don't instance default controls since miniview's camera will be synced
        // on the main view's one (see globeView.addFrameRequester)
        noControls: true,
    });

    // Set a 0 alpha clear value (instead of the default '1')
    // because we want a transparent background for the miniglobe view to be able
    // to see the main view "behind"
    miniView.mainLoop.gfxEngine.renderer.setClearColor(0x000000, 0);

    // update miniview's camera with the globeView's camera position
    globeView.addFrameRequester(itowns.MAIN_LOOP_EVENTS.AFTER_RENDER, function updateMiniView() {
        // clamp distance camera from globe
        var distanceCamera = globeView.camera.camera3D.position.length();
        var distance = Math.min(Math.max(distanceCamera * 1.5, minDistance), maxDistance);
        var camera = miniView.camera.camera3D;
        // Update target miniview's camera
        camera.position.copy(globeView.controls.moveTarget()).setLength(distance);
        camera.lookAt(globeView.controls.moveTarget());
        miniView.notifyChange(true);
    });

    // Add one imagery layer to the miniview
    itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(function _(layer) { miniView.addLayer(layer); });
}

// Add one imagery layer to the scene
// This layer is defined in a json file but it could be defined as a plain js
// object. See Layer* for more info.
var orthoLayerOptions = {
    // Choose here a unique id for your layer
    "id":         "Ortho",
    // we'll display this layer as color texture on our globe
    "type": "color",
    // protocol and url defines the datasource
    "protocol":   "wmts",
    // The api key 'va5orxd0pgzvq3jxutqfuy0b' is for testing purpose, and only usable in localhost.
    // When you'll host your application based on iTowns, you'll have to request a new api key if you want to use IGN datasources.
    "url":        "http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/geoportail/wmts",
    // this is the name of the layer to use in the above endpoint
    // (cf http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/geoportail/wmts?service=wmts&version=1.0.0&request=GetCapabilities)
    "name": "ORTHOIMAGERY.ORTHOPHOTOS",
    // this option will be passed to the loaders that'll do the individual fetching
    // see Fetcher.js
    "networkOptions": {
        "crossOrigin": "anonymous"
    },
    //
    "updateStrategy": {
        "type": itowns.STRATEGY_MIN_NETWORK_TRAFFIC,
        "options": {}
    },
    // what format to use, among the supported format of this layer
    "format": "image/jpeg",

    "options": {
        // store there your attributions for your datasource
        "attribution" : {
            "name":"IGN",
            "url":"http://www.ign.fr/"
        },
        // This defines the tilematrixset of our WMTS layer. Supported types are currently PM and WGS84G.
        // More to be supported in the futur.
        "tileMatrixSet": "PM",
    }
};

// now we need to set the WMTS limits. This should be compatible from what GetCapabilities returns.
// (cf http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/geoportail/wmts?service=wmts&version=1.0.0&request=GetCapabilities)
orthoLayerOptions.options.tileMatrixSetLimits = {
    "2": {
        "minTileRow": 0,
        "maxTileRow": 4,
        "minTileCol": 0,
        "maxTileCol": 4
    },
    "3": {
        "minTileRow": 0,
        "maxTileRow": 8,
        "minTileCol": 0,
        "maxTileCol": 8
    },
    "4": {
        "minTileRow": 0,
        "maxTileRow": 16,
        "minTileCol": 0,
        "maxTileCol": 16
    },
    "5": {
        "minTileRow": 0,
        "maxTileRow": 32,
        "minTileCol": 0,
        "maxTileCol": 32
    },
    "6": {
        "minTileRow": 1,
        "maxTileRow": 64,
        "minTileCol": 0,
        "maxTileCol": 64
    },
    "7": {
        "minTileRow": 3,
        "maxTileRow": 128,
        "minTileCol": 0,
        "maxTileCol": 128
    },
    "8": {
        "minTileRow": 7,
        "maxTileRow": 256,
        "minTileCol": 0,
        "maxTileCol": 256
    },
    "9": {
        "minTileRow": 15,
        "maxTileRow": 512,
        "minTileCol": 0,
        "maxTileCol": 512
    },
    "10": {
        "minTileRow": 31,
        "maxTileRow": 1024,
        "minTileCol": 0,
        "maxTileCol": 1024
    },
    "11": {
        "minTileRow": 62,
        "maxTileRow": 2048,
        "minTileCol": 0,
        "maxTileCol": 2048
    },
    "12": {
        "minTileRow": 125,
        "maxTileRow": 4096,
        "minTileCol": 0,
        "maxTileCol": 4096
    },
    "13": {
        "minTileRow": 2739,
        "maxTileRow": 4628,
        "minTileCol": 41,
        "maxTileCol": 7917
    },
    "14": {
        "minTileRow": 5478,
        "maxTileRow": 9256,
        "minTileCol": 82,
        "maxTileCol": 15835
    },
    "15": {
        "minTileRow": 10956,
        "maxTileRow": 18513,
        "minTileCol": 165,
        "maxTileCol": 31670
    },
    "16": {
        "minTileRow": 21912,
        "maxTileRow": 37026,
        "minTileCol": 330,
        "maxTileCol": 63341
    },
    "17": {
        "minTileRow": 43825,
        "maxTileRow": 74052,
        "minTileCol": 660,
        "maxTileCol": 126683
    },
    "18": {
        "minTileRow": 87651,
        "maxTileRow": 148105,
        "minTileCol": 1320,
        "maxTileCol": 253366
    },
    "19": {
        "minTileRow": 175302,
        "maxTileRow": 294060,
        "minTileCol": 170159,
        "maxTileCol": 343473
    },
    "20": {
        "minTileRow": 376733,
        "maxTileRow": 384679,
        "minTileCol": 530773,
        "maxTileCol": 540914
    }
};

// then we are finally ready to add our layer
globeView.addLayer(orthoLayerOptions);

// Add two elevation layers.
// These will deform iTowns globe geometry to represent terrain elevation.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/WORLD_DTM.json').then(addLayerCb));
promises.push(itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT_HIGHRES.json').then(addLayerCb));

exports.view = globeView;
exports.initialPosition = positionOnGlobe;
