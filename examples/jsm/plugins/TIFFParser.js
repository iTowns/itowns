import * as THREE from 'three';
import * as itowns from 'itowns';
// eslint-disable-next-line import/no-unresolved
import UTIF from 'UTIF';

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
 *         var source = new itowns.FileSource({ features: texture });
 *         var layer = new itowns.ColorLayer('tiff', { source });
 *         view.addLayer(layer);
 *     });
 *
 * @module TIFFParser
 */
const TIFFParser = (function _() {
    return {
        /**
         * Parse a TIFF file and return a `THREE.DataTexture`.
         *
         * @param {ArrayBuffer} data - The TIFF file content to parse.
         * @param {Object} options - options
         *
         * @return {Promise} A promise resolving with a `THREE.DataTexture`.
         *
         * @memberof module:TIFFParser
         */
        parse: function _(data, options) {
            const IFD = UTIF.decode(data)[0];
            UTIF.decodeImage(data, IFD);
            IFD.data = UTIF.toRGBA8(IFD);

            const maxSize = itowns.Capabilities.getMaxTextureSize();
            // A 4096 limitation sounds the most probable here
            // https://webglstats.com/webgl/parameter/MAX_TEXTURE_SIZE
            if (IFD.width > maxSize || IFD.height > maxSize) {
                throw new Error('The loaded TIFF is too big: please reduce it to a maximum size of maxSize by maxSize');
            }

            // Round to next power of two
            const width = THREE.MathUtils.ceilPowerOfTwo(IFD.width);
            const height = THREE.MathUtils.ceilPowerOfTwo(IFD.height);

            let resizedData;
            if (width == IFD.width && height == IFD.height) {
                resizedData = IFD.data;
            } else {
                resizedData = new IFD.data.constructor(width * height * 4);

                const it = IFD.data.values();
                const rowSize = IFD.height * 4;
                let rowOffset = 0;
                for (let i = 0; i < IFD.width; i++) {
                    rowOffset = i * width * 4;
                    resizedData.fill(255, rowOffset, rowOffset + rowSize);
                    for (let j = 0; j < rowSize; j++) {
                        resizedData[rowOffset + j] = it.next().value;
                    }
                }
            }

            const texture = new THREE.DataTexture(resizedData, width, height, THREE.RGBAFormat);
            texture.flipY = true;
            texture.needsUpdate = true;

            if (options.extent) {
                texture.extent = options.extent;
            }

            return Promise.resolve(texture);
        },
    };
}());

export default TIFFParser;
