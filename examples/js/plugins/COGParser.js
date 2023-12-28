/* global itowns, THREE */

/**
 * Select the best overview level (or the final image) to match the
 * requested extent and pixel width and height.
 *
 * @param {Source} source The COGSource
 * @param {Extent} requestExtent The window extent.
 * @param {number} requestWidth The pixel width of the window.
 * @param {number} requestHeight The pixel height of the window.
 * @returns {Object} The selected zoom level.
 */
function selectLevel(source, requestExtent, requestWidth, requestHeight) {
    // Number of images  = original + overviews if any
    const cropped = requestExtent.clone().intersect(source.extent);
    // Dimensions of the requested extent
    const extentDimension = cropped.planarDimensions();

    const targetResolution = Math.min(
        extentDimension.x / requestWidth,
        extentDimension.y / requestHeight,
    );

    let level;

    // Select the image with the best resolution for our needs
    for (let index = source.levels.length - 1; index >= 0; index--) {
        level = source.levels[index];
        const sourceResolution = Math.min(
            source.dimensions.x / level.width,
            source.dimensions.y / level.height,
        );

        if (targetResolution >= sourceResolution) {
            break;
        }
    }

    return level;
}

/**
 * Returns a window in the image's coordinates that matches the requested extent.
 *
 * @param {Source} source The COGSource
 * @param {Extent} extent The window extent.
 * @param {number[]} resolution The spatial resolution of the window.
 * @returns {number[]} The window.
 */
function makeWindowFromExtent(source, extent, resolution) {
    const [oX, oY] = source.origin;
    const [imageResX, imageResY] = resolution;

    const wnd = [
        Math.round((extent.west - oX) / imageResX),
        Math.round((extent.north - oY) / imageResY),
        Math.round((extent.east - oX) / imageResX),
        Math.round((extent.south - oY) / imageResY),
    ];

    const xMin = Math.min(wnd[0], wnd[2]);
    let xMax = Math.max(wnd[0], wnd[2]);
    const yMin = Math.min(wnd[1], wnd[3]);
    let yMax = Math.max(wnd[1], wnd[3]);

    // prevent zero-sized requests
    if (Math.abs(xMax - xMin) === 0) {
        xMax += 1;
    }
    if (Math.abs(yMax - yMin) === 0) {
        yMax += 1;
    }

    return [xMin, yMin, xMax, yMax];
}

/**
 * Creates a texture from the pixel buffer(s).
 *
 * @param {Source} source The COGSource
 * @param {Object} buffers The buffers (one buffer per band)
 * @returns {THREE.DataTexture} The generated texture.
 */
function createTexture(source, buffers) {
    const { width, height } = buffers;
    const pixelCount = width * height;
    const targetDataType = source.dataType;

    let format;
    let channelCount;
    switch (buffers.length) {
        case 1:
        case 2:
            format = THREE.RGFormat;
            channelCount = 2;
            break;
        default:
            format = THREE.RGBAFormat;
            channelCount = 4;
            break;
    }

    let texture;
    switch (targetDataType) {
        case THREE.UnsignedByteType: {
            const buf = new Uint8ClampedArray(pixelCount * channelCount);
            const data = fillBuffer(source, buf, { noData: source.noData }, source.opaqueByte, buffers);
            texture = new THREE.DataTexture(data, width, height, format, THREE.UnsignedByteType);
            break;
        }
        case THREE.FloatType: {
            const buf = new Float32Array(pixelCount * channelCount);
            const data = fillBuffer(source, buf, { noData: source.noData }, source.opaqueFloat, buffers);
            texture = new THREE.DataTexture(data, width, height, format, THREE.FloatType);
            break;
        }
        default:
            throw new Error('unsupported data type');
    }

    return texture;
}


// Important note : a lot of code is duplicated to avoid putting
// conditional branches inside loops, as this can severely reduce performance.
// Note: we don't use Number.isNan(x) in the loops as it slows down the loop due to function
// invocation. Instead, we use x !== x, as a NaN is never equal to itself.
/* eslint no-self-compare: 0 */
function fillBuffer(source, buffers, options, opaqueValue, pixelData) {
    let getValue;

    if (options.scaling !== undefined) {
        const { min, max } = options.scaling;
        getValue = x => Math.floor(THREE.MathUtils.mapLinear(x, min, max, 0, 255));
    } else {
        getValue = x => x;
    }

    if (pixelData.length === 1) {
        const v = pixelData[0];
        const length = v.length;
        for (let i = 0; i < length; i++) {
            const idx = i * 2;
            let value;
            let a;
            const raw = v[i];
            if (raw !== raw || raw === options.noData) {
                value = source.defaultNoData;
                a = source.defaultTransparent;
            } else {
                value = raw;
                a = opaqueValue;
            }
            buffers[idx + 0] = value;
            buffers[idx + 1] = a;
        }
    }
    if (pixelData.length === 2) {
        const v = pixelData[0];
        const a = pixelData[1];
        const length = v.length;
        for (let i = 0; i < length; i++) {
            const idx = i * 2;
            let value;
            const raw = v[i];
            if (raw !== raw || raw === options.noData) {
                value = source.defaultNoData;
            } else {
                value = raw;
            }
            buffers[idx + 0] = value;
            buffers[idx + 1] = a[i];
        }
    }
    if (pixelData.length === 3) {
        const rChannel = pixelData[0];
        const gChannel = pixelData[1];
        const bChannel = pixelData[2];
        const length = rChannel.length;
        let a;
        for (let i = 0; i < length; i++) {
            const idx = i * 4;

            let r = rChannel[i];
            let g = gChannel[i];
            let b = bChannel[i];

            if ((r !== r || r === options.noData)
                && (g !== g || g === options.noData)
                && (b !== b || b === options.noData)) {
                r = source.defaultNoData;
                g = source.defaultNoData;
                b = source.defaultNoData;
                a = source.defaultTransparent;
            } else {
                r = getValue(r);
                g = getValue(g);
                b = getValue(b);
                a = opaqueValue;
            }

            buffers[idx + 0] = r;
            buffers[idx + 1] = g;
            buffers[idx + 2] = b;
            buffers[idx + 3] = a;
        }
    }
    if (pixelData.length === 4) {
        const rChannel = pixelData[0];
        const gChannel = pixelData[1];
        const bChannel = pixelData[2];
        const aChannel = pixelData[3];
        const length = rChannel.length;
        for (let i = 0; i < length; i++) {
            const idx = i * 4;
            let r = rChannel[i];
            let g = gChannel[i];
            let b = bChannel[i];
            let a = aChannel[i];

            if ((r !== r || r === options.noData)
                && (g !== g || g === options.noData)
                && (b !== b || b === options.noData)) {
                r = source.defaultNoData;
                g = source.defaultNoData;
                b = source.defaultNoData;
                a = source.defaultTransparent;
            } else {
                r = getValue(r);
                g = getValue(g);
                b = getValue(b);
            }

            buffers[idx + 0] = r;
            buffers[idx + 1] = g;
            buffers[idx + 2] = b;
            buffers[idx + 3] = a;
        }
    }
    return buffers;
}

/**
 * The COGParser module provides a [parse]{@link module:COGParser.parse}
 * method that takes a COG in and gives a `THREE.DataTexture` that can be
 * displayed in the view.
 *
 * It needs the [geotiff](https://www.npmjs.com/package/geotiff) library to parse the
 * COG.
 *
 * @example
 * GeoTIFF.fromUrl('http://image.tif')
 *     .then(COGParser.parse)
 *     .then(function _(texture) {
 *         var source = new itowns.FileSource({ features: texture });
 *         var layer = new itowns.ColorLayer('cog', { source });
 *         view.addLayer(layer);
 *     });
 *
 * @module COGParser
 */
const COGParser = (function _() {
    if (typeof THREE == 'undefined'  && itowns.THREE) {
        // eslint-disable-next-line no-global-assign
        THREE = itowns.THREE;
    }

    return {
        /**
         * Parse a COG file and return a `THREE.DataTexture`.
         *
         * @param {Object} data Data passed with the Tile extent
         * @param {Object} options Options (contains source)
         * @return {Promise} A promise resolving with a `THREE.DataTexture`.
         *
         * @memberof module:COGParser
         */
        parse: async function _(data, options) {
            const source = options.in;
            const nodeExtent = data.extent.as(source.crs);
            const level = selectLevel(source, nodeExtent, source.tileWidth, source.tileHeight);
            const viewport = makeWindowFromExtent(source, nodeExtent, level.resolution);

            const buffers = await level.image.readRasters({
                pool: source.pool,
                fillValue: source.nodata,
                samples: source.channels,
                window: viewport,
            });

            const texture = createTexture(source, buffers);
            texture.flipY = true;
            texture.extent = data.extent;
            texture.needsUpdate = true;
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearFilter;

            return Promise.resolve(texture);
        },
    };
}());

if (typeof module != 'undefined' && module.exports) {
    module.exports = COGParser;
}
