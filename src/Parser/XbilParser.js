function portableXBIL(buffer) {
    this.floatArray = new Float32Array(buffer);
    this.max = undefined;
    this.min = undefined;
    this.texture = null;
}


export function computeMinMaxElevation(buffer, width, height, offsetScale) {
    let min = 1000000;
    let max = -1000000;

    if (!buffer) {
        // Return null values means there's no elevation values.
        // They can't be determined.
        // Don't return 0 because the result will be wrong
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
        // Return null values means the elevation values are incoherent
        // They can't be determined.
        // Don't return 0, -1000000 or 1000000 because the result will be wrong
        return { min: null, max: null };
    }
    return { min, max };
}

export default {
    /** @module XbilParser */
    /** Parse XBIL buffer and convert to portableXBIL object.
     * @function parse
     * @param {ArrayBuffer} buffer - the xbil buffer.
     * @param {Object} options - additional properties.
     * @param {string} options.url - the url from which the XBIL comes.
     * @return {Promise} - a promise that resolves with a portableXBIL object.
     *
     */
    parse(buffer, options) {
        if (!buffer) {
            throw new Error('Error processing XBIL');
        }

        var result = new portableXBIL(buffer);

        var elevation = computeMinMaxElevation(result.floatArray);

        result.min = elevation.min;
        result.max = elevation.max;

        result.url = options.url;

        return Promise.resolve(result);
    },
};
