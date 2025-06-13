import * as GeoTIFF from 'geotiff';
import { Extent } from '@itowns/geographic';

import { selectDataType, GeotiffNode } from '../Parser/GeotiffParser';
import COGParser from '../Parser/CogParser';
import Source from './Source';


class COGSource extends Source {
    overviews: Array<GeotiffNode>;
    defaultAlpha: number;
    resampleMethod: string;
    pool: GeoTIFF.Pool;

    // TODO: this should not be needed.
    zoom: { min: number, max: number };


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(source: any) {
        const {
            pool = new GeoTIFF.Pool(),
            defaultAlpha = 255,
            resampleMethod = 'nearest',
            zoom = { min: 0, max: Infinity },
            ...sourceConfig
        } = source;

        // We don't use fetcher, we let geotiff.js manage it
        sourceConfig.fetcher = () => Promise.resolve({});
        sourceConfig.parser = COGParser.parse;

        super(sourceConfig);

        this.zoom = zoom;  // TODO: should be removable

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


export default COGSource;

