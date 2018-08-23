import Projection from '../Core/Geographic/Projection';
import Extent from '../Core/Geographic/Extent';

export const SIZE_TEXTURE_TILE = 256;

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
    // The origin parameter is to be set to the correct value, bottom or top
    // (default being bottom) if the computation of the coordinates needs to be
    // inverted to match the same scheme as OSM, Google Maps or other system.
    // See link below for more information
    // https://alastaira.wordpress.com/2011/07/06/converting-tms-tile-coordinates-to-googlebingosm-tile-coordinates/
    computeTMSCoordinates(tile, extent, origin = 'bottom') {
        extent = tile.extent.crs() == extent.crs() ? extent : extent.as(tile.extent.crs());
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
};
