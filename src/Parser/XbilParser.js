/**
  * Calculates the minimum maximum elevation of xbil buffer
  *
  * @param      {number}  buffer       The buffer to parse
  * @param      {number}  width        The buffer's width
  * @param      {number}  height       The buffer's height
  * @param      {THREE.Vector4}  pitch  The pitch,  restrict zone to parse
  * @return     {Object}  The minimum maximum elevation.
  */
export function computeMinMaxElevation(buffer, width, height, pitch) {
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
            if (val > -10) {
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

// We check if the elevation texture has some significant values through corners
export function checkNodeElevationTextureValidity(data, noDataValue) {
    const l = data.length;
    return data[0] > noDataValue &&
           data[l - 1] > noDataValue &&
           data[Math.sqrt(l) - 1] > noDataValue &&
           data[l - Math.sqrt(l)] > noDataValue;
}

function getIndiceWithPitch(i, pitch, w) {
    // Return corresponding indice in parent tile using pitch
    const currentX = (i % w) / w;  // normalized
    const currentY = Math.floor(i / w) / w; // normalized
    const newX = pitch.x + currentX * pitch.z;
    const newY = pitch.y + currentY * pitch.w;
    const newIndice = Math.floor(newY * w) * w + Math.floor(newX * w);
    return newIndice;
}

// This function replaces noDataValue by significant values from parent texture
export function insertSignificantValuesFromParent(data, dataParent, noDataValue, pitch) {
    for (let i = 0, l = data.length; i < l; ++i) {
        if (data[i] === noDataValue) {
            data[i] = dataParent[getIndiceWithPitch(i, pitch, 256)];
        }
    }
}
