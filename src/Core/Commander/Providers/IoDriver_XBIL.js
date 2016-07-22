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

    if (buffer) {

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
            return undefined;

        return result;
    } else
        return undefined;
};

IoDriver_XBIL.prototype.read = function(url) {
    return fetch(url).then(function(response) {
        return response.arrayBuffer();
    }).then(function(buffer) {
        return this.parseXBil(buffer);
    }.bind(this));
};


export default IoDriver_XBIL;
