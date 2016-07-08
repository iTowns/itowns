//Create context
var width   = 64;
var height  = 64;
global.GL = require('gl')(width, height, { preserveDrawingBuffer: true });
console.log("MAX_TEXTURE_IMAGE_UNITS ", GL.getParameter(GL.MAX_TEXTURE_IMAGE_UNITS));
//var MockBrowser = require('mock-browser').mocks.MockBrowser;
//var mock = new MockBrowser();
element_listeners = [];
global.document = new function(){
    this.createElement = function(){
        return {
            style:{height:height, width:width}, 
            addEventListener:function(){
                element_listeners.push(Array.prototype.slice.call(arguments));
            }
        };
    };
};

timeout_listeners = [];
window_listeners = [];
global.window = {
    addEventListener:function(){
        window_listeners.push(Array.prototype.slice.call(arguments));
    }, 
    clearInterval:function(){}, 
    setTimeout:function(){
        timeout_listeners.push(Array.prototype.slice.call(arguments));
    }
};

global.Event = Object;
//global.TypeError = function(){};
console.log('runing test\n');

itowns = require('./dist/itowns2');
// //Clear screen to red
// gl.clearColor(1, 0, 0, 1);
// gl.clear(gl.COLOR_BUFFER_BIT);
//
//
var initCenter = { longitude:2.3465, latitude: 48.88, altitude: 25000000};
var viewerDiv = new function(){
    this.devicePixelRatio = 1.;
    this.clientWidth = width;
    this.clientHeight = height;
    this.addEventListener = function(){};
    this.appendChild = function(){};
}

itowns.viewer.createSceneGlobe(initCenter, viewerDiv) ;

itowns.viewer.addImageryLayer({
protocol:   "wmts",
id:         "Ortho",
url:        "http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/geoportail/wmts",
wmtsOptions: {
        //name:'GEOGRAPHICALGRIDSYSTEMS.MAPS',
        name: "ORTHOIMAGERY.ORTHOPHOTOS",
        mimetype: "image/jpeg",
        tileMatrixSet: "PM",
        tileMatrixSetLimits: {
           /* "0": {
                "minTileRow": 0,
                "maxTileRow": 1,
                "minTileCol": 0,
                "maxTileCol": 1
            },
            "1": {
                "minTileRow": 0,
                "maxTileRow": 2,
                "minTileCol": 0,
                "maxTileCol": 2
            },*/
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
                "maxTileRow": 6,
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
                "maxTileRow": 28,
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
                "maxTileRow": 8513,
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
                "maxTileRow": 48105,
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
        }
    }
});

itowns.viewer.addElevationLayer({
    protocol:   "wmts",
    id:         "IGN_MNT",
    url:        "http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/geoportail/wmts",
    noDataValue : -99999,
    wmtsOptions: {
            name: "ELEVATION.ELEVATIONGRIDCOVERAGE",
            mimetype: "image/x-bil;bits=32",
            tileMatrixSet: "WGS84G",
            tileMatrixSetLimits: {
                 // "2": {
                 //    "minTileRow": 0,
                 //    "maxTileRow": 2,
                 //    "minTileCol": 2,
                 //    "maxTileCol": 7
                 //  },
                  "3": {
                    "minTileRow": 1,
                    "maxTileRow": 5,
                    "minTileCol": 5,
                    "maxTileCol": 15
                  },
                  "4": {
                    "minTileRow": 3,
                    "maxTileRow": 10,
                    "minTileCol": 10,
                    "maxTileCol": 30
                  },
                  "5": {
                    "minTileRow": 6,
                    "maxTileRow": 20,
                    "minTileCol": 20,
                    "maxTileCol": 61
                  },
                  "6": {
                    "minTileRow": 13,
                    "maxTileRow": 40,
                    "minTileCol": 41,
                    "maxTileCol": 123
                  },
                  "7": {
                    "minTileRow": 27,
                    "maxTileRow": 80,
                    "minTileCol": 82,
                    "maxTileCol": 247
                  },
                  "8": {
                    "minTileRow": 54,
                    "maxTileRow": 160,
                    "minTileCol": 164,
                    "maxTileCol": 494
                  },
                  "9": {
                    "minTileRow": 108,
                    "maxTileRow": 321,
                    "minTileCol": 329,
                    "maxTileCol": 989
                  },
                  "10": {
                    "minTileRow": 216,
                    "maxTileRow": 642,
                    "minTileCol": 659,
                    "maxTileCol": 1979
                  },
                  "11": {
                    "minTileRow": 432,
                    "maxTileRow": 1285,
                    "minTileCol": 1319,
                    "maxTileCol": 3959
                  }
                }
        }
    });

itowns.viewer.update();

console.log('viewer.getZoomLevel',itowns.viewer.getZoomLevel());

for (var nb_update = 0; nb_update<1; nb_update++){
    for (var l=0; l<timeout_listeners.length; l++){
        var f = timeout_listeners[l][0];
        console.log(f.toString, timeout_listeners[l].slice(2));
        f.apply(timeout_listeners[l].slice(2));
    }
}

console.log('ok\n');
// //Write output as a PPM formatted image
if (false){
    var pixels = new Uint8Array(width * height * 4);
    GL.readPixels(0, 0, width, height, GL.RGBA, GL.UNSIGNED_BYTE, pixels);
    process.stdout.write(['P3\n# gl.ppm\n', width, " ", height, '\n255\n'].join(''))
    for(var i=0; i<pixels.length; i+=4) {
      for(var j=0; j<3; ++j) {
        process.stdout.write(pixels[i+j] + ' ')
      }
    }
}
//console.log(window_listeners);
//console.log(element_listeners);
//console.log(timeout_listeners);
