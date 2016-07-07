//Create context
var width   = 64;
var height  = 64;
global.gl = require('gl')(width, height, { preserveDrawingBuffer: true });

//var MockBrowser = require('mock-browser').mocks.MockBrowser;
//var mock = new MockBrowser();
global.document = new function(){
    this.createElement = function(){return Object();};
};

global.window = {};
global.Event = Object;
//global.TypeError = function(){};
process.stdout.write('runing test\n')

var ApiGlobe = require('Core/Commander/Interfaces/ApiInterface/ApiGlobe');
// //Clear screen to red
// gl.clearColor(1, 0, 0, 1);
// gl.clear(gl.COLOR_BUFFER_BIT);
//
//
// //Write output as a PPM formatted image
// var pixels = new Uint8Array(width * height * 4);
// gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
var viewer = new ApiGlobe();
var initCenter = { longitude:2.3465, latitude: 48.88, altitude: 25000000};
var viewerDiv = new function(){
    this.addEventListener = function(){};
}

viewer.createSceneGlobe(initCenter, viewerDiv) ;
process.stdout.write('viewer.getZoomLevel',viewer.getZoomLevel())
viewer.execute()

process.stdout.write('ok\n')
//process.stdout.write(['P3\n# gl.ppm\n', width, " ", height, '\n255\n'].join(''))
//for(var i=0; i<pixels.length; i+=4) {
//  for(var j=0; j<3; ++j) {
//    process.stdout.write(pixels[i+j] + ' ')
//
//  }
//}


