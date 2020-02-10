/* global itowns, Promise, THREE, UTIF */

/**
 * The TIFFParser module provides a [parse]{@link module:TIFFParser.parse}
 * method that takes a TIFF in and gives a `THREE.DataTexture` that can be
 * displayed in the view.
 *
 * It needs the [utif](https://www.npmjs.com/package/utif) library to parse the
 * TIFF.
 *
 * @example
 * Fetcher.arrayBuffer('image.tiff')
 *     .then(TIFFParser.parse)
 *     .then(function _(texture) {
 *         var source = new itowns.FileSource({ parsedData: texture });
 *         var layer = new itowns.ColorLayer('tiff', { source });
 *         view.addLayer(layer);
 *     });
 *
 * @module TIFFParser
 */
var TIFFParser = (function _() {
    if (typeof THREE == 'undefined'  && itowns.THREE) {
        // eslint-disable-next-line no-global-assign
        THREE = itowns.THREE;
    }

    return {
        /**
         * Parse a TIFF file and return a `THREE.DataTexture`.
         *
         * @param {ArrayBuffer} data - The TIFF file content to parse.
         *
         * @return {Promise} A promise resolving with a `THREE.DataTexture`.
         *
         * @memberof module:TIFFParser
         */
        parse: function _(data) {
            var IFD = UTIF.decode(data)[0];
            UTIF.decodeImage(data, IFD);
            IFD.data = UTIF.toRGBA8(IFD);

            var maxSize = itowns.Capabilities.getMaxTextureSize();
            // A 4096 limitation sounds the most probable here
            // https://webglstats.com/webgl/parameter/MAX_TEXTURE_SIZE
            if (IFD.width > maxSize || IFD.height > maxSize) {
                throw new Error('The loaded TIFF is too big: please reduce it to a maximum size of maxSize by maxSize');
            }

            // Round to next power of two
            var width = THREE.MathUtils.ceilPowerOfTwo(IFD.width);
            var height = THREE.MathUtils.ceilPowerOfTwo(IFD.height);

            var resizedData;
            if (width == IFD.width && height == IFD.height) {
                resizedData = IFD.data;
            } else {
                resizedData = new IFD.data.constructor(width * height * 4);

                var it = IFD.data.values();
                var rowSize = IFD.height * 4;
                var rowOffset = 0;
                for (var i = 0; i < IFD.width; i++) {
                    rowOffset = i * width * 4;
                    resizedData.fill(255, rowOffset, rowOffset + rowSize);
                    for (var j = 0; j < rowSize; j++) {
                        resizedData[rowOffset + j] = it.next().value;
                    }
                }
            }

            var texture = new THREE.DataTexture(resizedData, width, height, THREE.RGBAFormat);
            texture.flipY = true;
            texture.needsUpdate = true;

            if (data.extent) {
                texture.extent = data.extent;
            }

            return Promise.resolve(texture);
        },
    };
}());

if (typeof module != 'undefined' && module.exports) {
    module.exports = TIFFParser;
}
