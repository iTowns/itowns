/* global itowns, THREE */

/**
 * @typedef  {Object} GeoTIFFLevel
 * @property {GeoTIFFImage} image
 * @property {number} width
 * @property {number} height
 * @property {number[]} resolution
 */

/**
 * Select the best overview level (or the final image) to match the
 * requested extent and pixel width and height.
 *
 * @param {Object} source The COGSource
 * @param {Extent} source.extent Source extent
 * @param {GeoTIFFLevel[]} source.levels
 * @param {THREE.Vector2} source.dimensions
 * @param {Extent} requestExtent The node extent.
 * @param {number} requestWidth The pixel width of the window.
 * @param {number} requestHeight The pixel height of the window.
 * @returns {GeoTIFFLevel} The selected zoom level.
 */
function selectLevel(source, requestExtent, requestWidth, requestHeight) {
    // Dimensions of the requested extent
    const extentDimension = requestExtent.clone().planarDimensions();

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
 * @param {Object} source The COGSource
 * @param {number[]} source.origin Root image origin as an XYZ-vector
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
 * Reads raster data from the image as RGB.
 * The result is always an interleaved typed array.
 * Colorspaces other than RGB will be transformed to RGB, color maps expanded.
 *
 * @param {Source} source The COGSource.
 * @param {GeoTIFFLevel} level The GeoTIFF level to read
 * @param {number[]} viewport The image region to read.
 * @returns {Promise<TypedArray[]>} The raster data
 */
async function readRGB(source, level, viewport) {
    try {
        // TODO possible optimization: instead of letting geotiff.js crop and resample
        // the tiles into the desired region, we could use image.getTileOrStrip() to
        // read individual tiles (aka blocks) and make a texture per block. This way,
        // there would not be multiple concurrent reads for the same block, and we would not
        // waste time resampling the blocks since resampling is already done in the composer.
        // We would create more textures, but it could be worth it.
        return await level.image.readRGB({
            window: viewport,
            pool: source.pool,
            width: source.tileWidth,
            height: source.tileHeight,
            resampleMethod: source.resampleMethod,
            enableAlpha: true,
            interleave: true,
        });
    } catch (error) {
        if (error.toString() === 'AggregateError: Request failed') {
            // Problem with the source that is blocked by another fetch
            // (request failed in readRasters). See the conversations in
            // https://github.com/geotiffjs/geotiff.js/issues/218
            // https://github.com/geotiffjs/geotiff.js/issues/221
            // https://github.com/geotiffjs/geotiff.js/pull/224
            // Retry until it is not blocked.
            // TODO retry counter
            await new Promise((resolve) => {
                setTimeout(resolve, 100);
            });
            return readRGB(level, viewport, source);
        }
        throw error;
    }
}

/**
 * Creates a texture from the pixel buffer
 *
 * @param {Object} source The COGSource
 * @param {THREE.TypedArray[]} buffer The pixel buffer
 * @param {number} buffer.width
 * @param {number} buffer.height
 * @param {number} buffer.byteLength
 * @returns {THREE.DataTexture} The generated texture.
 */
function createTexture(source, buffer) {
    const { byteLength } = buffer;
    const width = source.tileWidth;
    const height = source.tileHeight;
    const pixelCount = width * height;
    const targetDataType = source.dataType;
    const format = THREE.RGBAFormat;
    const channelCount = 4;
    const isRGBA = pixelCount * channelCount === byteLength;
    let tmpBuffer = buffer;

    switch (targetDataType) {
        case THREE.UnsignedByteType: {
            if (!isRGBA) {
                tmpBuffer = convertToRGBA(tmpBuffer, new Uint8ClampedArray(pixelCount * channelCount), source.defaultAlpha);
            }
            return new THREE.DataTexture(tmpBuffer, width, height, format, THREE.UnsignedByteType);
        }
        case THREE.FloatType: {
            if (!isRGBA) {
                tmpBuffer = convertToRGBA(tmpBuffer, new Float32Array(pixelCount * channelCount), source.defaultAlpha / 255);
            }
            return new THREE.DataTexture(tmpBuffer, width, height, format, THREE.FloatType);
        }
        default:
            throw new Error('unsupported data type');
    }
}

/**
 * Convert RGB pixel buffer to RGBA pixel buffer
 *
 * @param {THREE.TypedArray[]} buffer The RGB pixel buffer
 * @param {THREE.TypedArray[]} newBuffer The empty RGBA pixel buffer
 * @param {number} defaultAlpha Default alpha value
 * @returns {THREE.DataTexture} The generated texture.
 */
function convertToRGBA(buffer, newBuffer, defaultAlpha) {
    const { width, height } = buffer;

    for (let i = 0; i < width * height; i++) {
        const oldIndex = i * 3;
        const index = i * 4;
        // Copy RGB from original buffer
        newBuffer[index + 0] = buffer[oldIndex + 0]; // R
        newBuffer[index + 1] = buffer[oldIndex + 1]; // G
        newBuffer[index + 2] = buffer[oldIndex + 2]; // B
        // Add alpha to new buffer
        newBuffer[index + 3] = defaultAlpha; // A
    }

    return newBuffer;
}

/**
 * The COGParser module provides a [parse]{@link module:COGParser.parse}
 * method that takes a COG in and gives a `THREE.DataTexture` that can be
 * displayed in the view.
 *
 * It needs the [geotiff](https://github.com/geotiffjs/geotiff.js/) library to parse the
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
         * @param {Extent} data.extent
         * @param {Object} options Options (contains source)
         * @param {Object} options.in
         * @param {COGSource} options.in.source
         * @param {number} options.in.tileWidth
         * @param {number} options.in.tileHeight
         * @return {Promise<THREE.DataTexture>} A promise resolving with a `THREE.DataTexture`.
         *
         * @memberof module:COGParser
         */
        parse: async function _(data, options) {
            const source = options.in;
            const tileExtent = options.extent.isExtent ? options.extent.as(source.crs) : options.extent.toExtent(source.crs);

            const level = selectLevel(source, tileExtent, source.tileWidth, source.tileHeight);
            const viewport = makeWindowFromExtent(source, tileExtent, level.resolution);
            const rgbBuffer = await readRGB(source, level, viewport);
            const texture = createTexture(source, rgbBuffer);
            texture.flipY = true;
            texture.extent = options.extent;
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
