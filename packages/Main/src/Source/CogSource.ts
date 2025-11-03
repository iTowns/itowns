import * as GeoTIFF from 'geotiff';
import { Extent } from '@itowns/geographic';

import { selectDataType, GeotiffNode } from '../Parser/GeotiffParser';
import COGParser from '../Parser/CogParser';
import Source from './Source';


type CogSourceConfig = {
    /**
     * URL of the COG resource.
     */
    url: string;
    /**
     * If COG images are RGB encoded, they need to be converted to RGBA before
     * being parsed to Three.js textures. In that case, this property's value is
     * set in the alpha channel of the RGBA image.
     */
    defaultAlpha?: number;
    /**
     * The resampling method used when extracting data from a COG image.
     */
    resampleMethod?: string;
    /**
     * An optional decoder pool to use when extracting data from a COG image.
     */
    pool?: GeoTIFF.Pool;
    [key: string]: any;  // eslint-disable-line @typescript-eslint/no-explicit-any
}


/**
 * A source for [Cloud Optimized Geotiff](https://cogeo.org/) (COG) data.
 *
 * Such data consists of a [GeoTIFF](https://www.ogc.org/fr/standards/geotiff/)
 * file that stores a georeferenced image and downsampled versions of this
 * image. The original image is always the first image in the COG file. The
 * downsampled versions are called "overviews". They share the same position and
 * geographic extent with the original image. Their resolution (in distance per
 * pixel) however is higher.
 *
 * A freshly created CogSource fetches and parses the header and metadata for
 * each image (original and overviews) from the file into an array of nodes.
 * Each of these nodes contains information about an image (origin,
 * resolution...) and an accessor to get the actual image data. This array is
 * what CogSource's parser later uses to create textures that contain the COG
 * file data.
 *
 * At the moment, iTowns only displays data either as single band or RGBA
 * textures. Therefore, a COG image with a number of samples other than 1, 2 or
 * 3 won't be displayed.
 */
class CogSource extends Source {
    isCogSource: true;

    /**
     * An array storing one node for each image of the COG data.
     */
    overviews: Array<GeotiffNode>;

    defaultAlpha: number;
    resampleMethod: string;
    pool: GeoTIFF.Pool;

    /**
     * @param config - Source configuration.
     */
    constructor(config: CogSourceConfig) {
        const {
            pool = new GeoTIFF.Pool(),
            defaultAlpha = 255,
            resampleMethod = 'nearest',
            ...sourceConfig
        } = config;

        // We don't use fetcher, we let geotiff.js manage it
        sourceConfig.fetcher = () => Promise.resolve({});
        sourceConfig.parser = COGParser.parse;

        super(sourceConfig);
        this.isCogSource = true;

        this.defaultAlpha = defaultAlpha;
        this.pool = pool;
        this.resampleMethod = resampleMethod;

        this.overviews = [];

        this.whenReady = GeoTIFF.fromUrl(this.url)
            .then(async (geotiff) => {
                const firstImage = await geotiff.getImage();
                const firstImageOrigin = firstImage.getOrigin();
                const dataType = selectDataType(
                    firstImage.getSampleFormat(),
                    firstImage.getBitsPerSample(),
                );

                // Compute extent of root image
                const [minX, minY, maxX, maxY] = firstImage.getBoundingBox();
                this.extent = new Extent(this.crs, minX, maxX, minY, maxY);

                this.overviews.push(
                    new GeotiffNode({
                        image: firstImage,
                        origin: firstImageOrigin,
                        dataType,
                    }),
                );

                // Number of images (original + overviews)
                const imageCount = await geotiff.getImageCount();
                const promises = [];
                for (let index = 1; index < imageCount; index++) {
                    const promise = geotiff.getImage(index)
                        .then(
                            image => new GeotiffNode({
                                image,
                                resolution: image.getResolution(firstImage),
                                origin: firstImageOrigin,
                                dataType,
                            }),
                        );
                    promises.push(promise);
                }
                this.overviews = this.overviews.concat(await Promise.all(promises));
            });
    }

    extentInsideLimit(extent: Extent) {
        return this.extent.intersectsExtent(extent);
    }

    urlFromExtent() {
        return '';
    }
}


export default CogSource;

