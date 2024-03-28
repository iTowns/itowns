/* global itowns, GeoTIFF, COGParser, THREE  */

/**
 * @classdesc
 * An object defining the source of resources to get from a [COG]{@link
 * https://www.cogeo.org/} file. It
 * inherits from {@link Source}.
 *
 * @extends Source
 *
 * @property {Object} zoom - Object containing the minimum and maximum values of
 * the level, to zoom in the source.
 * @property {number} zoom.min - The minimum level of the source. Default value is 0.
 * @property {number} zoom.max - The maximum level of the source. Default value is Infinity.
 * @property {string} url - The URL of the COG.
 * @property {GeoTIFF.Pool} pool - Pool use to decode GeoTiff.
 * @property {number} defaultAlpha - Alpha byte value used if no alpha is present in COG. Default value is 255.
 * @property {number} tileWidth - Tile width in pixels. Default value use 'geotiff.getTileWidth()'.
 * @property {number} tileHeight - Tile height in pixels. Default value use 'geotiff.getTileHeight()'.
 * @property {number} resampleMethod - The desired resampling method. Default is 'nearest'.
 *
 * @example
 * // Create the source
 * const cogSource = new itowns.COGSource({
 *     url: 'https://cdn.jsdelivr.net/gh/iTowns/iTowns2-sample-data/cog/orvault.tif',
 * });
 *
 * // Create the layer
 * const colorLayer = new itowns.ColorLayer('COG', {
 *     source: cogSource,
 * });
 *
 * // Add the layer
 * view.addLayer(colorLayer);
 */
class COGSource extends itowns.Source {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * COGSource and {@link Source}. Only `url` is mandatory.
     * @constructor
     */
    constructor(source) {
        super(source);

        if (source.zoom) {
            this.zoom = source.zoom;
        } else {
            this.zoom = { min: 0, max: Infinity };
        }

        this.url = source.url;
        this.pool = source.pool || new GeoTIFF.Pool();
        // We don't use fetcher, we let geotiff.js manage it
        this.fetcher = () => Promise.resolve({});
        this.parser = COGParser.parse;

        this.defaultAlpha = source.defaultAlpha || 255;

        this.whenReady = GeoTIFF.fromUrl(this.url)
            .then(async (geotiff) => {
                this.geotiff = geotiff;
                this.firstImage = await geotiff.getImage();
                this.origin = this.firstImage.getOrigin();
                this.dataType = this.selectDataType(this.firstImage.getSampleFormat(), this.firstImage.getBitsPerSample());
                this.tileWidth = source.tileWidth || this.firstImage.getTileWidth();
                this.tileHeight = source.tileHeight || this.firstImage.getTileHeight();
                this.resampleMethod = source.resampleMethod || 'nearest';

                // Compute extent
                const [minX, minY, maxX, maxY] = this.firstImage.getBoundingBox();
                this.extent = new itowns.Extent(this.crs, minX, maxX, minY, maxY);
                this.dimensions = this.extent.planarDimensions();

                this.levels = [];
                this.levels.push(this.makeLevel(this.firstImage, this.firstImage.getResolution()));

                // Number of images (original + overviews)
                const imageCount = await this.geotiff.getImageCount();

                const promises = [];
                for (let index = 1; index < imageCount; index++) {
                    const promise = this.geotiff.getImage(index)
                        .then(image => this.makeLevel(image, image.getResolution(this.firstImage)));
                    promises.push(promise);
                }
                this.levels = this.levels.concat(await Promise.all(promises));
            });
    }

    /**
     * @param {number} format - Format to interpret each data sample in a pixel
     * https://www.awaresystems.be/imaging/tiff/tifftags/sampleformat.html
     * @param {number} bitsPerSample - Number of bits per component.
     * https://www.awaresystems.be/imaging/tiff/tifftags/bitspersample.html
     * @return {THREE.AttributeGPUType}
     */
    selectDataType(format, bitsPerSample) {
        switch (format) {
            case 1: // unsigned integer data
                if (bitsPerSample <= 8) {
                    return THREE.UnsignedByteType;
                }
                break;
            default:
                break;
        }
        return THREE.FloatType;
    }

    makeLevel(image, resolution) {
        return {
            image,
            width: image.getWidth(),
            height: image.getHeight(),
            resolution,
        };
    }

    // We don't use UrlFromExtent, we let geotiff.js manage it
    urlFromExtent() {
        return '';
    }

    extentInsideLimit(extent) {
        return this.extent.intersectsExtent(extent);
    }
}

if (typeof module != 'undefined' && module.exports) {
    module.exports = COGSource;
}
