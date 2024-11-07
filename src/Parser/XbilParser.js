import { readTextureValueWithBilinearFiltering } from 'Utils/DEMUtils';

function minMax4Corners(texture, pitch, options) {
    const u = pitch.x;
    const v = pitch.y;
    const w = pitch.z;
    const z = [
        readTextureValueWithBilinearFiltering(options, texture, u, v),
        readTextureValueWithBilinearFiltering(options, texture, u + w, v),
        readTextureValueWithBilinearFiltering(options, texture, u + w, v + w),
        readTextureValueWithBilinearFiltering(options, texture, u, v + w),
    ].filter(val => val != undefined);

    if (z.length) {
        return { min: Math.min(...z), max: Math.max(...z) };
    } else {
        return {
            min: Infinity,
            max: -Infinity,
        };
    }
}

/**
 * Calculates the minimum maximum texture elevation with xbil data
 *
 * @param      {THREE.Texture}   texture                     The texture to parse
 * @param      {THREE.Vector4}   pitch                       The pitch,  restrict zone to parse
 * @param      {Object}          options                     No data value and clamp values
 * @param      {number}          options.noDataValue         No data value
 * @param      {number}          [options.zmin]   The minimum elevation value after which it will be clamped
 * @param      {number}          [options.zmax]   The maximum elevation value after which it will be clamped
 * @return     {Object}  The minimum and maximum elevation.
 */
export function computeMinMaxElevation(texture, pitch, options) {
    const { width, height, data } = texture.image;
    if (!data) {
        // Return null values means there's no elevation values.
        // They can't be determined.
        // Don't return 0 because the result will be wrong
        return { min: null, max: null };
    }

    // compute the minimum and maximum elevation on the 4 corners texture.
    let { min, max } = minMax4Corners(texture, pitch, options);

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
                if (val !== options.noDataValue) {
                    max = Math.max(max, val);
                    min = Math.min(min, val);
                }
            }
        }
    }

    // Clamp values to zmin and zmax values configured in ElevationLayer
    if (options.zmin != null) {
        if (min < options.zmin) { min = options.zmin; }
        if (max < options.zmin) { max = options.zmin; }
    }

    if (options.zmax != null) {
        if (min > options.zmax) { min = options.zmax; }
        if (max > options.zmax) { max = options.zmax; }
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

// This function replaces noDataValue by significant values from parent texture (or 0)
export function insertSignificantValuesFromParent(data, dataParent = () => 0, noDataValue) {
    for (let i = 0, l = data.length; i < l; ++i) {
        if (data[i] === noDataValue) {
            data[i] = dataParent(i);
        }
    }
}
