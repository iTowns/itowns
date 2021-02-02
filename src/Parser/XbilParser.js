import { readTextureValueWithBilinearFiltering } from 'Utils/DEMUtils';

function minMax4Corners(texture, pitch, noDataValue) {
    const u = pitch.x;
    const v = pitch.y;
    const w = pitch.z;
    const z = [
        readTextureValueWithBilinearFiltering({ noDataValue }, texture, u, v),
        readTextureValueWithBilinearFiltering({ noDataValue }, texture, u + w, v),
        readTextureValueWithBilinearFiltering({ noDataValue }, texture, u + w, v + w),
        readTextureValueWithBilinearFiltering({ noDataValue }, texture, u, v + w),
    ].filter(v => v != undefined && v > -10);

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
    let { min, max } = minMax4Corners(texture, pitch, noDataValue) || { max: -Infinity, min: Infinity };

    const sizeX = Math.floor(pitch.z * width);

    if (sizeX > 2) {
        const sizeY = Math.floor(pitch.z * height);
        const xs = Math.floor(pitch.x * width);
        const ys = Math.floor(pitch.y * height);
        const inc = Math.max(Math.floor(sizeX / 32), 2);
        const limX = ys + sizeY;
        for (let y = ys; y < limX; y += inc) {
            const pit = y * (width || 0);
            let x = pit + xs;
            const limX = x + sizeX;
            for (x; x < limX; x += inc) {
                const val = data[x];
                if (val > -10 && val != noDataValue) {
                    max = Math.max(max, val);
                    min = Math.min(min, val);
                }
            }
        }
    }

    if (max === -Infinity || min === Infinity) {
        // Return null values means the elevation values are incoherent
        // They can't be determined.
        // Don't return 0, -Infinity or Infinity because the result will be wrong
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
