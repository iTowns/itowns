/**
 * Generated On: 2015-10-5
 * Class: IoDriver_XBIL
 */
/* global Float32Array*/

import IoDriver from 'Core/Commander/Providers/IoDriver';


var portableXBIL = function(buffer) {
    this.floatArray = new Float32Array(buffer);
    this.max = -1000000;
    this.min = 1000000;
    this.texture = -1;
    this.level = -1;
};


function IoDriver_XBIL() {
    //Constructor
    IoDriver.call(this);

}

IoDriver_XBIL.prototype = Object.create(IoDriver.prototype);

IoDriver_XBIL.prototype.constructor = IoDriver_XBIL;

IoDriver_XBIL.prototype.parseXBil = function(buffer) {
    if (!buffer) {
        throw new Error('Error processing XBIL');
    }

    var result = new portableXBIL(buffer);
    // Compute min max using subampling
    for (var i = 0; i < result.floatArray.length; i += 16) {
        var val = result.floatArray[i];
        if (val > -10.0 && val !== undefined) {
            result.max = Math.max(result.max, val);
            result.min = Math.min(result.min, val);
        }
    }

    if (result.max === -1000000)
        throw new Error('Error processing XBIL');

    return result;
};

IoDriver_XBIL.prototype.read = function(url) {
    return fetch(url).then(response => {
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`Error loading ${url}: status ${response.status}`);
        }
        return response.arrayBuffer();
    }).then(buffer => this.parseXBil(buffer));
};


export default IoDriver_XBIL;
