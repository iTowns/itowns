import { _readTextureValueWithBilinearFiltering } from 'Utils/DEMUtils';

function minMax4Corners(texture, width, height, pitch, noDataValue) {
    const u = pitch.x;
    const v = pitch.y;
    const w = pitch.z;
    const z = [
        _readTextureValueWithBilinearFiltering({ noDataValue }, texture, u, v),
        _readTextureValueWithBilinearFiltering({ noDataValue }, texture, u + w, v),
        _readTextureValueWithBilinearFiltering({ noDataValue }, texture, u + w, v + w),
        _readTextureValueWithBilinearFiltering({ noDataValue }, texture, u, v + w),
    ].filter(v => v != undefined);

    if (z.length) {
        return { min: Math.min(...z), max: Math.max(...z) };
    }
}

/**
  * Calculates the minimum maximum texture elevation with xbil data
  *
  * @param      {THREE.Texture}  texture       The texture to parse
  * @param      {THREE.Vector4}  pitch  The pitch,  restrict zone to parse
 * @param      {number}  noDataValue  No data value
  * @return     {Object}  The minimum maximum elevation.
  */
export function computeMinMaxElevation(texture, pitch, noDataValue) {
    const { width, height, data } = texture.image;
    if (!data) {
        // Return null values means there's no elevation values.
        // They can't be determined.
        // Don't return 0 because the result will be wrong
        return { min: null, max: null };
    }

    // compute extact minimum and maximum elvation on 4 corners texture.
    let { min, max } = minMax4Corners(texture, width, height, pitch, noDataValue) || { max: -Infinity, min: Infinity };

    const sizeX = pitch ? Math.floor(pitch.z * width) : data.length;

    if (sizeX > 2) {
        const sizeY = pitch ? Math.floor(pitch.z * height) : 1;
        const xs = pitch ? Math.floor(pitch.x * width) : 0;
        const ys = pitch ? Math.floor(pitch.y * height) : 0;
        const inc = pitch ? Math.max(Math.floor(sizeX / 8), 2) : 16;
        for (let y = ys; y < ys + sizeY; y += inc) {
            const pit = y * (width || 0);
            for (let x = xs; x < xs + sizeX; x += inc) {
                const val = data[pit + x];
                if (val > -10 || val != noDataValue) {
                    max = Math.max(max, val);
                    min = Math.min(min, val);
                }
            }
        }
    }

    if (max === -Infinity || min === Infinity) {
        // Return null values means the elevation values are incoherent
        // They can't be determined.
        // Don't return 0, -1000000 or 1000000 because the result will be wrong
        return { min: null, max: null };
    } else {
        return { min, max };
    }
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
