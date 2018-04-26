import * as THREE from 'three';
import Fetcher from './Fetcher';
import Cache from '../Core/Scheduler/Cache';
import XbilParser from '../Parser/XbilParser';
import Projection from '../Core/Geographic/Projection';
import Extent from '../Core/Geographic/Extent';

export const SIZE_TEXTURE_TILE = 256;

const getTextureFloat = function getTextureFloat(buffer) {
    const texture = new THREE.DataTexture(buffer, SIZE_TEXTURE_TILE, SIZE_TEXTURE_TILE, THREE.AlphaFormat, THREE.FloatType);
    texture.needsUpdate = true;
    return texture;
};

const tileCoord = new Extent('WMTS:WGS84G', 0, 0, 0);

export default {
    getColorTextureByUrl(url, networkOptions) {
        return Cache.get(url) || Cache.set(url, Fetcher.texture(url, networkOptions)
            .then((texture) => {
                texture.generateMipmaps = false;
                texture.magFilter = THREE.LinearFilter;
                texture.minFilter = THREE.LinearFilter;
                texture.anisotropy = 16;
                return texture;
            }), Cache.POLICIES.TEXTURE);
    },
    getXBilTextureByUrl(url, networkOptions) {
        return Cache.get(url) || Cache.set(url, Fetcher.arrayBuffer(url, networkOptions)
            .then(buffer => XbilParser.parse(buffer, { url }))
            .then((result) => {
                // TODO  RGBA is needed for navigator with no support in texture float
                // In RGBA elevation texture LinearFilter give some errors with nodata value.
                // need to rewrite sample function in shader

                const texture = getTextureFloat(result.floatArray);
                texture.generateMipmaps = false;
                texture.magFilter = THREE.LinearFilter;
                texture.minFilter = THREE.LinearFilter;
                texture.min = result.min;
                texture.max = result.max;
                return texture;
            }), Cache.POLICIES.ELEVATION);
    },
    computeTileMatrixSetCoordinates(tile, tileMatrixSet) {
        // Are WMTS coordinates ready?
        if (!tile.wmtsCoords) {
            tile.wmtsCoords = {};
        }

        tileMatrixSet = tileMatrixSet || 'WGS84G';
        if (!(tileMatrixSet in tile.wmtsCoords)) {
            if (tile.wmtsCoords.WGS84G) {
                const c = tile.wmtsCoords.WGS84G[0];
                tileCoord.zoom = c.zoom;
                tileCoord.col = c.col;
                tileCoord.row = c.row;
            } else {
                Projection.WGS84toWMTS(tile.extent, tileCoord);
            }

            tile.wmtsCoords[tileMatrixSet] =
                Projection.getCoordWMTS_WGS84(tileCoord, tile.extent, tileMatrixSet);
        }
    },
    // The origin parameter is to be set to the correct value, bottom or top
    // (default being bottom) if the computation of the coordinates needs to be
    // inverted to match the same scheme as OSM, Google Maps or other system.
    // See link below for more information
    // https://alastaira.wordpress.com/2011/07/06/converting-tms-tile-coordinates-to-googlebingosm-tile-coordinates/
    computeTMSCoordinates(tile, extent, origin = 'bottom') {
        if (tile.extent.crs() != extent.crs()) {
            throw new Error('Unsupported configuration. TMS is only supported when geometry has the same crs than TMS layer');
        }
        const c = tile.extent.center();
        const layerDimension = extent.dimensions();

        // Each level has 2^n * 2^n tiles...
        // ... so we count how many tiles of the same width as tile we can fit in the layer
        const tileCount = Math.round(layerDimension.x / tile.extent.dimensions().x);
        // ... 2^zoom = tilecount => zoom = log2(tilecount)
        const zoom = Math.floor(Math.log2(tileCount));

        // Now that we have computed zoom, we can deduce x and y (or row / column)
        const x = (c.x() - extent.west()) / layerDimension.x;
        let y;
        if (origin == 'top') {
            y = (extent.north() - c.y()) / layerDimension.y;
        } else {
            y = (c.y() - extent.south()) / layerDimension.y;
        }

        return [new Extent('TMS', zoom, Math.floor(y * tileCount), Math.floor(x * tileCount))];
    },
    WMTS_WGS84Parent(cWMTS, levelParent, pitch, target = new Extent(cWMTS.crs(), 0, 0, 0)) {
        const diffLevel = cWMTS.zoom - levelParent;
        const diff = Math.pow(2, diffLevel);
        const invDiff = 1 / diff;

        const r = (cWMTS.row - (cWMTS.row % diff)) * invDiff;
        const c = (cWMTS.col - (cWMTS.col % diff)) * invDiff;

        if (pitch) {
            pitch.x = cWMTS.col * invDiff - c;
            pitch.y = cWMTS.row * invDiff - r;
            pitch.z = invDiff;
            pitch.w = invDiff;
        }

        return target.set(levelParent, r, c);
    },
};
