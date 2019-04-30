import * as THREE from 'three';
import Projection from 'Core/Geographic/Projection';
import Extent from 'Core/Geographic/Extent';
import Coordinates from 'Core/Geographic/Coordinates';

const c = new Coordinates('EPSG:4326', 180, 85.06);
const layerDimension = new THREE.Vector2();
const tileDimension = new THREE.Vector2();

// Size in pixel
export const SIZE_TEXTURE_TILE = 256;
export const SIZE_DIAGONAL_TEXTURE = Math.pow(2 * (SIZE_TEXTURE_TILE * SIZE_TEXTURE_TILE), 0.5);

const tileCoord = new Extent('WMTS:WGS84G', 0, 0, 0);

export default {
    computeTileMatrixSetCoordinates(tile, tileMatrixSet) {
        tileMatrixSet = tileMatrixSet || 'WGS84G';
        if (!(tileMatrixSet in tile.wmtsCoords)) {
            if (tile.wmtsCoords.WGS84G) {
                const c = tile.wmtsCoords.WGS84G[0];
                tileCoord.zoom = c.zoom;
                tileCoord.col = c.col;
                tileCoord.row = c.row;
            } else {
                Projection.WGS84toWMTS(tile.extent, tileCoord);
                tile.wmtsCoords.WGS84G = [tileCoord.clone()];
            }

            tile.wmtsCoords[tileMatrixSet] =
                Projection.getCoordWMTS_WGS84(tileCoord, tile.extent, tileMatrixSet);
        }
    },
    // The isInverted parameter is to be set to the correct value, true or false
    // (default being false) if the computation of the coordinates needs to be
    // inverted to match the same scheme as OSM, Google Maps or other system.
    // See link below for more information
    // https://alastaira.wordpress.com/2011/07/06/converting-tms-tile-coordinates-to-googlebingosm-tile-coordinates/
    computeTMSCoordinates(tile, extent, isInverted) {
        extent = tile.extent.crs == extent.crs ? extent : extent.as(tile.extent.crs, extent);
        tile.extent.center(c);
        extent.dimensions(layerDimension);
        tile.extent.dimensions(tileDimension);

        // Each level has 2^n * 2^n tiles...
        // ... so we count how many tiles of the same width as tile we can fit in the layer
        const tileCount = Math.round(layerDimension.x / tileDimension.x);
        // ... 2^zoom = tilecount => zoom = log2(tilecount)
        const zoom = Math.floor(Math.log2(tileCount));

        // Now that we have computed zoom, we can deduce x and y (or row / column)
        const x = (c.x - extent.west) / layerDimension.x;
        let y;
        if (isInverted) {
            y = (extent.north - c.y) / layerDimension.y;
        } else {
            y = (c.y - extent.south) / layerDimension.y;
        }

        return [new Extent('TMS', zoom, Math.floor(y * tileCount), Math.floor(x * tileCount))];
    },
};
