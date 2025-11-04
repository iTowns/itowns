import {
    DataTexture,
    RedFormat,
    Vector2,
} from 'three';

import { TEXTURE_TILE_DIM } from 'Provider/Fetcher';
import { GeotiffNode } from 'Parser/GeotiffParser';

import type { TextureWithExtent } from 'Parser/GeotiffParser';


const DEFAULT_MAX_TEXTURE_SIZE = 10 * 1024 * 1024;


/**
 * Given geographic and pixel dimensions of a target image, and given the
 * content of a COG file, select the image in the COG that best matches the
 * target image resolution. It is kind of an equivalent of finding the best zoom
 * level in a TMS to display data on a given extent.
 *
 * To do so, the method loops through an array of the images contained in a COG
 * file (original and overviews), ordered by decreasing resolution. As soon as
 * the COG image resolution gets more accurate than the target image resolution,
 * the image from the last iteration is defined as the best match.
 */
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
        throw Error(
            'Unable to determine a best overview for given extent in the COG dataset. LevelTree'
            + ' parsed by CogSource is probably empty.',
        );
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
            maxTextureSize = DEFAULT_MAX_TEXTURE_SIZE,
        },
        extent,
    } = options;

    const tileExtent = extent.isExtent ? extent.as(crs) : extent.toExtent(crs);
    const tileWorldDimensions = tileExtent.planarDimensions();
    const tileRasterDimensions = new Vector2(TEXTURE_TILE_DIM, TEXTURE_TILE_DIM);

    // GeoTIFFBase has an experimental readRasters method that has an
    // `bbox` parameter we could use instead of implementing our own
    // selectLevel. See
    // https://geotiffjs.github.io/geotiff.js/module-geotiff-GeoTIFFBase.html
    // After testing, it turns out GeoTIFFBase method to get the best overview
    // from a bbox is much slower than ours (by almost a factor 5).
    const overview = selectOverview(overviews, tileWorldDimensions, tileRasterDimensions);

    const imageWindow = overview.extentToImageWindow(tileExtent);
    const windowSize = (imageWindow[2] - imageWindow[0]) * (imageWindow[3] - imageWindow[1]) * 4;

    let texture: TextureWithExtent;

    // If the image that geotiff.js will try to load is to heavy, we prevent
    // loading it. Instead, we return a blank texture that is as light as a
    // DataTexture can get in three.js while still having a non-null image.
    //
    // Returning a blank texture is needed because of iTowns process for raster
    // data: it implies parsed data being always a defined TextureWithExtent.
    // This could be avoided, should there be a way to interrupt the update
    // process of a tile from the parser and without causing an error.
    //
    // Elevation data process also implies non-null data contained in this
    // TextureWithExtent, hence the usage of a Uint8Array() instead of the
    // default null value.
    if (windowSize > maxTextureSize) {
        console.warn(
            'The lowest resolution overview of COG data is too large to be displayed on the'
            + ' requested extent. You should increase the minimum zoom in the corresponding layer'
            + ` properties to at least ${extent.zoom + 1}.`,
        );
        texture = <TextureWithExtent> new DataTexture(
            new Uint8Array(1),
            1,
            1,
            RedFormat,
        );
    } else {
        texture = <TextureWithExtent> await overview.extractTexture({
            imageWindow,
            textureDimensions: tileRasterDimensions,
            resampleMethod,
            defaultAlpha,
            pool,
        });
    }
    texture.extent = extent;

    return texture;
}


export default { parse };

