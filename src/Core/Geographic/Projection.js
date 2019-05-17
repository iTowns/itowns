/**
 * Generated On: 2015-10-5
 * Class: Projection
 * Description: Outils de projections cartographiques et de convertion
 */
import { Math as MathExt } from 'three';
import Coordinates from 'Core/Geographic/Coordinates';
import Extent from 'Core/Geographic/Extent';

const PI_OV_FOUR = Math.PI / 4;
const PI_OV_TWO = Math.PI / 2;
const INV_TWO_PI = 1.0 / (Math.PI * 2);
const LOG_TWO = Math.log(2.0);

// TODO: Clamp to 85.0511288° because:
// longitude 180° to X EPSG:3857 = 20037508.34m
// To get a square, we convert Y 20037508.34m to latitude, we get 85.0511288°
// Change it when we will change worldDimension3857 in Extent.js
function WGS84LatitudeClamp(latitude) {
    return Math.min(84, Math.max(-86, latitude));
}

const dim = { x: 0, y: 0 };
const center = new Coordinates('EPSG:4326', 0, 0, 0);

const Projection = {
    /**
     * Convert latitude to y coordinate in pseudo mercator (EPSG:3857)
     * @param {number} latitude - latitude in degrees (EPSG:4326)
     * @return {number} y coordinate in pseudo mercator
     */
    latitudeToY_PM(latitude) {
        return 0.5 - Math.log(Math.tan(PI_OV_FOUR + MathExt.degToRad(latitude) * 0.5)) * INV_TWO_PI;
    },

    /**
     * Convert from y coordinate pseudo mercator (EPSG:3857) to latitude
     * @param {number} y - y coordinate in pseudo mercator
     * @return {number} - latitude in degrees (EPSG:4326)
     */
    y_PMTolatitude(y) {
        return MathExt.radToDeg(2 * (Math.atan(Math.exp(-(y - 0.5) / INV_TWO_PI)) - PI_OV_FOUR));
    },

    computeWmtsPm(extent_wmtsWgs84g, extent_epsg4326) {
        const extents_WMTS_PM = [];
        const level = extent_wmtsWgs84g.zoom + 1;
        const nbRow = 2 ** level;

        const sizeRow = 1.0 / nbRow;

        const yMin = Projection.latitudeToY_PM(WGS84LatitudeClamp(extent_epsg4326.north));
        const yMax = Projection.latitudeToY_PM(WGS84LatitudeClamp(extent_epsg4326.south));

        let maxRow;

        const min = yMin / sizeRow;
        const max = yMax / sizeRow;

        const minRow = Math.floor(min);
        // ]N; N+1] => N
        maxRow = Math.ceil(max) - 1;
        // make sure we don't exceed boundaries
        maxRow = Math.min(maxRow, nbRow - 1);

        const minCol = extent_wmtsWgs84g.col;
        const maxCol = minCol;

        for (let r = maxRow; r >= minRow; r--) {
            for (let c = minCol; c <= maxCol; c++) {
                extents_WMTS_PM.push(new Extent('WMTS:PM', level, r, c));
            }
        }

        return extents_WMTS_PM;
    },

    extent_Epsg4326_To_WmtsWgs84g(extent_epsg4326, extent_wmtsWgs84g = new Extent('WMTS:WGS84G', 0, 0, 0)) {
        extent_epsg4326.dimensions(dim);

        const zoom = Math.floor(Math.log(Math.PI / MathExt.degToRad(dim.y)) / LOG_TWO + 0.5);

        const nY = 2 ** zoom;
        const nX = 2 * nY;

        const uX = Math.PI * 2 / nX;
        const uY = Math.PI / nY;

        extent_epsg4326.center(center);
        const col = Math.floor((Math.PI + MathExt.degToRad(center.longitude)) / uX);
        const row = Math.floor(nY - (PI_OV_TWO + MathExt.degToRad(center.latitude)) / uY);
        return extent_wmtsWgs84g.set(zoom, row, col);
    },
};

export default Projection;
