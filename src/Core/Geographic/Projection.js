/**
 * Generated On: 2015-10-5
 * Class: Projection
 * Description: Outils de projections cartographiques et de convertion
 */
import MathExt from '../Math/MathExtended';
import Coordinates, { UNIT } from './Coordinates';
import Extent from './Extent';


function Projection() {
    // Constructor

}

Projection.prototype.WGS84ToY = function WGS84ToY(latitude) {
    return 0.5 - Math.log(Math.tan(MathExt.PI_OV_FOUR + latitude * 0.5)) * MathExt.INV_TWO_PI;
};

Projection.prototype.YToWGS84 = function YToWGS84(y) {
    return 2 * (Math.atan(Math.exp(-(y - 0.5) / MathExt.INV_TWO_PI)) - MathExt.PI_OV_FOUR);
};

Projection.prototype.WGS84ToOneSubY = function WGS84ToOneSubY(latitude) {
    // TODO remove me
    return 0.5 + Math.log(Math.tan(MathExt.PI_OV_FOUR + latitude * 0.5)) * MathExt.INV_TWO_PI;
};

const min = -86 / 180 * Math.PI;
const max = 84 / 180 * Math.PI;
Projection.prototype.WGS84LatitudeClamp = function WGS84LatitudeClamp(latitude) {
    return Math.min(max, Math.max(min, latitude));
};

Projection.prototype.getCoordWMTS_WGS84 = function getCoordWMTS_WGS84(tileCoord, bbox, tileMatrixSet) {
    // TODO: PM, WGS84G are hard-coded reference to IGN's TileMatrixSet
    if (tileMatrixSet === 'PM') {
        return this.WMTS_WGS84ToWMTS_PM(tileCoord, bbox);
    } else if (tileMatrixSet === 'WGS84G') {
        return [tileCoord.clone()];
    } else {
        throw new Error(`Unsupported TileMatrixSet '${tileMatrixSet}'`);
    }
};

/**
 *
 * @param {type} cWMTS
 * @param {type} bbox
 * @returns {Array} coord WMTS array in pseudo mercator
 */
Projection.prototype.WMTS_WGS84ToWMTS_PM = function WMTS_WGS84ToWMTS_PM(cWMTS, bbox) {
    var wmtsBox = [];
    var level = cWMTS.zoom + 1;
    var nbRow = Math.pow(2, level);

    // var sY      = this.WGS84ToY(this.WGS84LatitudeClamp(-Math.PI*0.5)) - this.WGS84ToY(this.WGS84LatitudeClamp(Math.PI*0.5));
    var sizeRow = 1.0 / nbRow;

    var yMin = this.WGS84ToY(this.WGS84LatitudeClamp(bbox.north(UNIT.RADIAN)));
    var yMax = this.WGS84ToY(this.WGS84LatitudeClamp(bbox.south(UNIT.RADIAN)));

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
};

const dim = { x: 0, y: 0 };
const center = new Coordinates('EPSG:4326', 0, 0, 0);
Projection.prototype.WGS84toWMTS = function WGS84toWMTS(bbox, target = new Extent('WMTS:WGS84G', 0, 0, 0)) {
    bbox.dimensions(UNIT.RADIAN, dim);

    var zoom = Math.floor(Math.log(MathExt.PI / dim.y) / MathExt.LOG_TWO + 0.5);

    var nY = Math.pow(2, zoom);
    var nX = 2 * nY;

    var uX = MathExt.TWO_PI / nX;
    var uY = MathExt.PI / nY;

    bbox.center(center);
    var col = Math.floor((MathExt.PI + center.longitude(UNIT.RADIAN)) / uX);
    var row = Math.floor(nY - (MathExt.PI_OV_TWO + center.latitude(UNIT.RADIAN)) / uY);
    return target.set(zoom, row, col);
};

Projection.prototype.UnitaryToLongitudeWGS84 = function UnitaryToLongitudeWGS84(u, bbox) {
    bbox.dimensions(UNIT.RADIAN, dim);
    return bbox.west(UNIT.RADIAN) + u * dim.x;
};

Projection.prototype.UnitaryToLatitudeWGS84 = function UnitaryToLatitudeWGS84(v, bbox) {
    bbox.dimensions(UNIT.RADIAN, dim);
    return bbox.south(UNIT.RADIAN) + v * dim.y;
};

Projection.prototype.wgs84_to_lambert93 = function wgs84_to_lambert93(latitude, longitude) // , x93, y93)
    {
        /*
        rfrences :
        Mthode de calcul pour une projection de type lambert conique conforme scante (
        NTG_71.pdf):
        http://www.ign.fr/affiche_rubrique.asp?rbr_id=1700&lng_id=FR
        */

        // variables:

        // systme WGS84
    var a = 6378137; // demi grand axe de l'ellipsoide (m)
    var e = 0.08181919106; // premire excentricit de l'ellipsoide


    var deg2rad = function deg2rad() {};

        // paramtres de projections
        // var l0 =deg2rad(3);
    var lc = deg2rad(3); // longitude de rfrence
    var phi0 = deg2rad(46.5); // latitude d'origine en radian
    var phi1 = deg2rad(44); // 1er parallele automcoque
    var phi2 = deg2rad(49); // 2eme parallele automcoque

    var x0 = 700000; // coordonnes l'origine
    var y0 = 6600000; // coordonnes l'origine

        // coordonnes du point traduire
    var phi = deg2rad(latitude);
    var l = deg2rad(longitude);

        // calcul des grandes normales
    var gN1 = a / Math.sqrt(1 - e * e * Math.sin(phi1) * Math.sin(phi1));
    var gN2 = a / Math.sqrt(1 - e * e * Math.sin(phi2) * Math.sin(phi2));

        // calculs de slatitudes isomtriques
    var gl1 = Math.log(Math.tan(Math.PI / 4 + phi1 / 2) * Math.pow((1 - e * Math.sin(phi1)) / (1 + e * Math.sin(phi1)), e / 2));

    var gl2 = Math.log(Math.tan(Math.PI / 4 + phi2 / 2) * Math.pow((1 - e * Math.sin(phi2)) / (1 + e * Math.sin(phi2)), e / 2));

    var gl0 = Math.log(Math.tan(Math.PI / 4 + phi0 / 2) * Math.pow((1 - e * Math.sin(phi0)) / (1 + e * Math.sin(phi0)), e / 2));

    var gl = Math.log(Math.tan(Math.PI / 4 + phi / 2) * Math.pow((1 - e * Math.sin(phi)) / (1 + e * Math.sin(phi)), e / 2));

        // calcul de l'exposant de la projection
    var n = (Math.log((gN2 * Math.cos(phi2)) / (gN1 * Math.cos(phi1)))) / (gl1 - gl2); // ok

        // calcul de la constante de projection
    var c = ((gN1 * Math.cos(phi1)) / n) * Math.exp(n * gl1); // ok

        // calcul des coordonnes
    var ys = y0 + c * Math.exp(-1 * n * gl0);

        // calcul des coordonnes lambert
    var x93 = x0 + c * Math.exp(-1 * n * gl) * Math.sin(n * (l - lc));
    var y93 = ys - c * Math.exp(-1 * n * gl) * Math.cos(n * (l - lc));

    return {
        x: x93,
        y: y93,
    };
};


export default Projection;
