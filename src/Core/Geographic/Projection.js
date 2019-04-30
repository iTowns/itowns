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

function WGS84LatitudeClamp(latitude) {
    return Math.min(84, Math.max(-86, latitude));
}

const dim = { x: 0, y: 0 };
const center = new Coordinates('EPSG:4326', 0, 0, 0);

const Projection = {
    /**
     * Convert latitude to y coordinate in TileMatrixSet
     * @param {number} latitude - latitude in degrees
     * @return {number}
     */
    WGS84ToY(latitude) {
        return 0.5 - Math.log(Math.tan(PI_OV_FOUR + MathExt.degToRad(latitude) * 0.5)) * INV_TWO_PI;
    },

    /**
     * Convert from y coordinate in TileMatrixSet to WGS84 latitude
     * @param {number} y - coords in TileMatrixSet
     * @return {number} - latitude in degrees
     */
    YToWGS84(y) {
        return MathExt.radToDeg(
            2 * (Math.atan(Math.exp(-(y - 0.5) / INV_TWO_PI)) - PI_OV_FOUR));
    },

    getCoordWMTS_WGS84(tileCoord, bbox, tileMatrixSet) {
        // TODO: PM, WGS84G are hard-coded reference to IGN's TileMatrixSet
        if (tileMatrixSet === 'PM') {
            return WMTS_WGS84ToWMTS_PM(tileCoord, bbox);
        } else if (tileMatrixSet === 'WGS84G') {
            return [tileCoord.clone()];
        } else {
            throw new Error(`Unsupported TileMatrixSet '${tileMatrixSet}'`);
        }
    },

    WGS84toWMTS(bbox, target = new Extent('WMTS:WGS84G', 0, 0, 0)) {
        bbox.dimensions(dim);

        var zoom = Math.floor(
            Math.log(Math.PI / MathExt.degToRad(dim.y)) / LOG_TWO + 0.5);

        var nY = 2 ** zoom;
        var nX = 2 * nY;

        var uX = Math.PI * 2 / nX;
        var uY = Math.PI / nY;

        bbox.center(center);
        var col = Math.floor((Math.PI + MathExt.degToRad(center.longitude)) / uX);
        var row = Math.floor(nY - (PI_OV_TWO + MathExt.degToRad(center.latitude)) / uY);
        return target.set(zoom, row, col);
    },

    UnitaryToLongitudeWGS84(u, bbox) {
        bbox.dimensions(dim);
        return bbox.west + u * dim.x;
    },

    UnitaryToLatitudeWGS84(v, bbox) {
        bbox.dimensions(dim);
        return bbox.south + v * dim.y;
    },
};


function WMTS_WGS84ToWMTS_PM(cWMTS, bbox) {
    var wmtsBox = [];
    var level = cWMTS.zoom + 1;
    var nbRow = 2 ** level;

    var sizeRow = 1.0 / nbRow;

    var yMin = Projection.WGS84ToY(WGS84LatitudeClamp(bbox.north));
    var yMax = Projection.WGS84ToY(WGS84LatitudeClamp(bbox.south));

    let maxRow;

    const min = yMin / sizeRow;
    const max = yMax / sizeRow;

    const minRow = Math.floor(min);
    // ]N; N+1] => N
    maxRow = Math.ceil(max) - 1;
    // make sure we don't exceed boundaries
    maxRow = Math.min(maxRow, nbRow - 1);

    var minCol = cWMTS.col;
    var maxCol = minCol;

    for (let r = maxRow; r >= minRow; r--) {
        for (let c = minCol; c <= maxCol; c++) {
            wmtsBox.push(new Extent('WMTS:PM', level, r, c));
        }
    }

    return wmtsBox;
}

export default Projection;
