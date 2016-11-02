//import gl from 'gl';
const readline = require('readline');
const fs = require('fs');

//Create context
var width   = 800;
var height  = 600;
//global.gl = gl(width, height, { preserveDrawingBuffer: true });
// global.gl = require('gl')(width, height, { preserveDrawingBuffer: true });

// ggg.clearColor(1, 0, 0, 1);
// gl.clear(gl.COLOR_BUFFER_BIT);

//var MockBrowser = require('mock-browser').mocks.MockBrowser;
//var mock = new MockBrowser();

var ggg;

global.document = new function(){
    this.createElement = function(){
        var r = new Object();
        r.getContext = function(s, attributes) { ggg = require('gl')(width, height, attributes); console.log('context built!');return ggg; }
        r.addEventListener = function(){};
        r.style = {};
        return r;
    };
    this.createElementNS = function(){
        var r = new Object();
        r.addEventListener = function(){};
        r.style = {};
        return r;
    };
    this.createEventObject = function(){
        console.log('createEventObject');
        return {};
    }
};

global.window = {
    addEventListener: function(){}
};
global.Event = Object;

global.XMLHttpRequest = require('xhr2');

var itowns = require(process.env.PWD + '/dist/itowns2_test.js');

var viewerDiv = new function(){
    this.addEventListener = function(){};
    this.appendChild = function(){};
    this.clientWidth = width;
    this.clientHeight = height;
    this.devicePixelRatio = 1.0;
}

var initCenter = { longitude:22.3465, latitude: 18.88, altitude: 25000000};
itowns.default.viewer.createSceneGlobe(initCenter, viewerDiv);

global.window.setTimeout = setTimeout;
global.window.clearInterval = clearInterval;

itowns.default.viewer.update();
itowns.default.viewer.update();
itowns.default.viewer.update();
itowns.default.viewer.update();
itowns.default.viewer.update();


const rl = readline.createInterface({
   input: process.stdin,
   output: process.stdout
});

rl.question('Press enter to get a lovely screenshot? ', (answer) => {
    fs.open('screnshot.ppm', 'w', (err, fd) => {
      if (err) {
        if (err.code === "EEXIST") {
          console.error('myfile already exists');
          return;
        } else {
          throw err;
        }
      }

    // //Write output as a PPM formatted image
    var pixels = new Uint8Array(width * height * 4);
    ggg.readPixels(0, 0, width, height, ggg.RGBA, ggg.UNSIGNED_BYTE, pixels);

    fs.write(fd, ['P3\n# screnshot.ppm\n', width, " ", height, '\n255\n'].join(''))
    for(var i=0; i<pixels.length; i+=4) {
      var s = '';
      for(var j=0; j<3; ++j) {
        s = s + pixels[i+j] + ' ';
      }
      // console.log(s);
      fs.write(fd, s);
     fs.write(fd, '\n');
    }

});




  rl.close();
});
