import { Vector2 } from 'three';

import { GeotiffNode } from './GeotiffParser';

import type { TextureWithExtent } from './GeotiffParser';


function selectOverview(
    geotiffNodes: Array<GeotiffNode>,
    worldDimensions: Vector2,
    rasterDimensions: Vector2,
) {
    const targetResolution = Math.min(
        worldDimensions.x / rasterDimensions.x,
        worldDimensions.y / rasterDimensions.y,
    );

    let overview;

    for (let index = geotiffNodes.length - 1; index >= 0; index--) {
        overview = geotiffNodes[index];
        const sourceResolution = Math.min(
            Math.abs(overview.resolution[0]),
            Math.abs(overview.resolution[1]),
        );

        if (targetResolution >= sourceResolution) {
            break;
        }
    }

    if (!overview) {
        throw Error('No level found. LevelTree must be empty');  // TODO: make better message
    }

    return overview;
}


// A parser for COG should not be exposed as a Parser module since it only works
// with a COGSource.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parse(data: any, options: any) {
    const {
        in: {
            crs,
            defaultAlpha,
            resampleMethod,
            overviews,
            pool,
        },
        extent,
    } = options;

    const tileExtent = extent.isExtent ? extent.as(crs) : extent.toExtent(crs);
    const tileWorldDimensions = tileExtent.planarDimensions();
    const tileRasterDimensions = new Vector2(
        255,
        Math.round(255 * tileWorldDimensions.y / tileWorldDimensions.x),
    );

    // TODO: GeoTIFFBase has an experimental readRasters method that has an
    //  `bbox` parameter we could use instead of implementing our own
    //  selectLevel. See
    //  https://geotiffjs.github.io/geotiff.js/module-geotiff-GeoTIFFBase.html
    //  After testing, it turns out GeoTIFFBase method to get the best overview
    //  from a bbox is much slower than ours (by almost a factor 5).
    const overview = selectOverview(overviews, tileWorldDimensions, tileRasterDimensions);

    const texture = <TextureWithExtent> await overview.extractTexture({
        textureExtent: tileExtent,
        textureDimensions: tileRasterDimensions,
        resampleMethod,
        defaultAlpha,
        pool,
    });
    texture.extent = extent;

    return texture;
}


export default { parse };

