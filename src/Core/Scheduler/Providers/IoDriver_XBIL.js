import Fetcher from './Fetcher';


var portableXBIL = function portableXBIL(buffer) {
    this.floatArray = new Float32Array(buffer);
    this.max = undefined;
    this.min = undefined;
    this.texture = null;
};


function IoDriver_XBIL() {
}

IoDriver_XBIL.prototype.computeMinMaxElevation = function computeMinMaxElevation(buffer, width, height, offsetScale) {
    let min = 1000000;
    let max = -1000000;

    if (!buffer) {
        return { min: null, max: null };
    }

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
        return { min: null, max: null };
    }
    return { min, max };
};

IoDriver_XBIL.prototype.parseXBil = function parseXBil(buffer, url) {
    if (!buffer) {
        throw new Error('Error processing XBIL');
    }

    var result = new portableXBIL(buffer);

    var elevation = this.computeMinMaxElevation(result.floatArray);

    result.min = elevation.min;
    result.max = elevation.max;

    result.url = url;

    return result;
};


IoDriver_XBIL.prototype.read = function read(url, networkOptions) {
    return Fetcher.arrayBuffer(url, networkOptions).then(buffer => this.parseXBil(buffer, url));
};


export default IoDriver_XBIL;
