/**
  * Calculates the minimum maximum elevation of xbil buffer
  *
  * @param      {number}  buffer       The buffer to parse
  * @param      {number}  width        The buffer's width
  * @param      {number}  height       The buffer's height
  * @param      {THREE.Vector4}  pitch  The pitch,  restrict zone to parse
  * @return     {Object}  The minimum maximum elevation.
  */
function computeMinMaxElevation(buffer, width, height, pitch) {
    let min = 1000000;
    let max = -1000000;

    if (!buffer) {
        // Return null values means there's no elevation values.
        // They can't be determined.
        // Don't return 0 because the result will be wrong
        return { min: null, max: null };
    }

    const sizeX = pitch ? Math.floor(pitch.z * width) : buffer.length;
    const sizeY = pitch ? Math.floor(pitch.z * height) : 1;
    const xs = pitch ? Math.floor(pitch.x * width) : 0;
    const ys = pitch ? Math.floor(pitch.y * height) : 0;

    const inc = pitch ? Math.max(Math.floor(sizeX / 8), 2) : 16;

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

export default computeMinMaxElevation;
