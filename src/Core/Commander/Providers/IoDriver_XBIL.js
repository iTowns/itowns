/**
 * Generated On: 2015-10-5
 * Class: IoDriver_XBIL
 */
/* global Float32Array*/

import IoDriver from 'Core/Commander/Providers/IoDriver';


var portableXBIL = function (buffer) {
    this.floatArray = new Float32Array(buffer);
    this.max = -1000000;
    this.min = 1000000;
    this.texture = -1;
    this.level = -1;
};


function IoDriver_XBIL() {
    // Constructor
    IoDriver.call(this);
}

IoDriver_XBIL.prototype = Object.create(IoDriver.prototype);

IoDriver_XBIL.prototype.constructor = IoDriver_XBIL;

IoDriver_XBIL.prototype.computeMinMaxElevation = function (buffer, width, height, offsetScale) {
    let min = 1000000;
    let max = -1000000;

    const sizeX = offsetScale ? Math.floor(offsetScale.z * width) : buffer.length;
    const sizeY = offsetScale ? Math.floor(offsetScale.z * height) : 1;
    const xs = offsetScale ? Math.floor(offsetScale.x * width) : 0;
    const ys = offsetScale ? Math.floor(offsetScale.y * height) : 0;

    const inc = offsetScale ? Math.max(Math.floor(sizeX / 8), 2) : 16;

    for (let y = ys; y < ys + sizeY; y += inc) {
        const pit = y * (width || 0);
        for (let x = xs; x < xs + sizeX; x += inc) {
            const val = buffer[pit + x];
            if (val > -10.0 && val !== undefined) {
                max = Math.max(max, val);
                min = Math.min(min, val);
            }
        }
    }

    if (max === -1000000 || min === 1000000) {
        return { min: undefined, max: undefined };
    }
    return { min, max };
};

IoDriver_XBIL.prototype.parseXBil = function (buffer, url) {
    if (!buffer) {
        throw new Error('Error processing XBIL');
    }

    var result = new portableXBIL(buffer);

    var elevation = this.computeMinMaxElevation(result.floatArray);

    if (elevation.min === undefined || elevation.max === undefined) {
        throw new Error('Error processing XBIL');
    }

    result.min = elevation.min;
    result.max = elevation.max;

    result.url = url;

    return result;
};


IoDriver_XBIL.prototype.read = function (url) {
    return fetch(url).then((response) => {
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`Error loading ${url}: status ${response.status}`);
        }
        return response.arrayBuffer();
    }).then(buffer => this.parseXBil(buffer, url));
};


export default IoDriver_XBIL;
