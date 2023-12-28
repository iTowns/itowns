/* global itowns, GeoTIFF, COGParser, THREE  */

/**
 * @classdesc
 * An object defining the source of resources to get from a [COG]{@link
 * https://www.cogeo.org/} file. It
 * inherits from {@link Source}.
 *
 * @extends Source
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
     *
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

        this.defaultNoData = source.defaultNoData || 255;
        this.defaultTransparent = source.defaultTransparent || 0;
        this.opaqueByte = source.opaqueByte || 255;
        this.opaqueFloat = source.opaqueFloat || 1;

        this.whenReady = GeoTIFF.fromUrl(this.url)
            .then(async (geotiff) => {
                this.geotiff = geotiff;
                this.firstImage = await geotiff.getImage();
                this.origin = this.firstImage.getOrigin();
                this.noData = (source.noData !== undefined) ? source.noData : this.firstImage.getGDALNoData();
                this.dataType = this.selectDataType(this.firstImage.getSampleFormat(), this.firstImage.getBitsPerSample());

                this.channels = [];
                for (let i = 0; i < this.firstImage.getSamplesPerPixel(); i += 1) {
                    this.channels.push(i);
                }

                this.tileWidth = this.firstImage.getTileWidth();
                this.tileHeight = this.firstImage.getTileHeight();

                // Compute extent
                const [minX, minY, maxX, maxY] = this.firstImage.getBoundingBox();
                this.extent = new itowns.Extent(this.crs, minX, maxX, minY, maxY);
                this.dimensions = this.extent.planarDimensions();

                this.levels = [];
                this.levels.push(this.makeLevel(this.firstImage, this.firstImage.getResolution()));

                // Number of images (original + overviews)
                const imageCount = await this.geotiff.getImageCount();

                // We want to preserve the order of the overviews so we await them inside
                // the loop not to have the smallest overviews coming before the biggest
                for (let index = 1; index < imageCount; index++) {
                    // eslint-disable-next-line no-await-in-loop
                    const image = await this.geotiff.getImage(index);
                    this.levels.push(this.makeLevel(image, image.getResolution(this.firstImage)));
                }
            });
    }

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
