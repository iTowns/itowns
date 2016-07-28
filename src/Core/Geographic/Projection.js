/**
 * Generated On: 2015-10-5
 * Class: Projection
 * Description: Outils de projections cartographiques et de convertion
 */

import CoordWMTS from 'Core/Geographic/CoordWMTS';
import MathExt from 'Core/Math/MathExtented';
import CoordCarto from 'Core/Geographic/CoordCarto';
import THREE from 'THREE';


function Projection() {
    //Constructor

}

Projection.prototype.WGS84ToY = function(latitude) {

    return 0.5 - Math.log(Math.tan(MathExt.PI_OV_FOUR + latitude * 0.5)) * MathExt.INV_TWO_PI;

};

Projection.prototype.WGS84ToOneSubY = function(latitude) {

    return 0.5 + Math.log(Math.tan(MathExt.PI_OV_FOUR + latitude * 0.5)) * MathExt.INV_TWO_PI;

};

Projection.prototype.WGS84LatitudeClamp = function(latitude) {

    //var min = -68.1389  / 180 * Math.PI;
    var min = -86 / 180 * Math.PI;
    var max = 84 / 180 * Math.PI;

    latitude = Math.max(min, latitude);
    latitude = Math.min(max, latitude);

    return latitude;

};


Projection.prototype.getCoordWMTS_WGS84 = function(tileCoord, bbox, tileMatrixSet) {

    if (tileMatrixSet === 'PM')
        return this.WMTS_WGS84ToWMTS_PM(tileCoord, bbox);
    else if (tileMatrixSet === 'WGS84G')
        return [tileCoord, tileCoord];
};

Projection.prototype.getAllCoordsWMTS = function(tileCoord, bbox, tileMatrixSets) {

    var tilesMT = [];

    for (var key in tileMatrixSets)

        tilesMT[key] = this.getCoordsWMTS(tileCoord, bbox, key);

    return tilesMT;

};

Projection.prototype.getCoordsWMTS = function(tileCoord, bbox, tileMatrixSet) {

    var box = this.getCoordWMTS_WGS84(tileCoord, bbox, tileMatrixSet);
    var tilesMT = [];

    for (var row = box[0].row; row < box[1].row + 1; row++)

        tilesMT.push(new CoordWMTS(box[0].zoom, row, box[0].col));


    return tilesMT;
};


/**
 *
 * @param {type} cWMTS
 * @param {type} bbox
 * @returns {Array} coord WMTS array in pseudo mercator
 */
Projection.prototype.WMTS_WGS84ToWMTS_PM = function(cWMTS, bbox) {

    var wmtsBox = [];
    var level = cWMTS.zoom + 1;
    var nbRow = Math.pow(2, level);

    //var sY      = this.WGS84ToY(this.WGS84LatitudeClamp(-Math.PI*0.5)) - this.WGS84ToY(this.WGS84LatitudeClamp(Math.PI*0.5));
    var sizeRow = 1.0 / nbRow;

    var yMin = this.WGS84ToY(this.WGS84LatitudeClamp(bbox.maxCarto.latitude));
    var yMax = this.WGS84ToY(this.WGS84LatitudeClamp(bbox.minCarto.latitude));

    var minRow, maxRow, min, max;

    min = yMin / sizeRow;
    max = yMax / sizeRow;

    minRow = Math.floor(min);
    maxRow = Math.floor(max);

    if (max - maxRow === 0.0 || maxRow === nbRow)
        maxRow--;

    var minCol = cWMTS.col;
    var maxCol = minCol;

    wmtsBox.push(new CoordWMTS(level, minRow, minCol));
    wmtsBox.push(new CoordWMTS(level, maxRow, maxCol));

    return wmtsBox;

};

Projection.prototype.WMTS_WGS84Parent = function(cWMTS, levelParent, pitch) {

    var diffLevel = cWMTS.zoom - levelParent;
    var diff = Math.pow(2, diffLevel);
    var invDiff = 1 / diff;

    var r = (cWMTS.row - (cWMTS.row % diff)) * invDiff;
    var c = (cWMTS.col - (cWMTS.col % diff)) * invDiff;

    pitch.x = cWMTS.col * invDiff - c;
    pitch.y = cWMTS.row * invDiff - r;
    pitch.z = invDiff;

    return new CoordWMTS(levelParent, r, c);

};

Projection.prototype.WMS_WGS84Parent = function(bbox, bboxParent) {
    var scale = bbox.dimension.x / bboxParent.dimension.x;

    var x =
        Math.abs(bbox.minCarto.longitude - bboxParent.minCarto.longitude) /
        bboxParent.dimension.x;
    var y =
        Math.abs(
            bbox.minCarto.latitude + bbox.dimension.y -
            (bboxParent.minCarto.latitude + bboxParent.dimension.y)) /
        bboxParent.dimension.x;

    return new THREE.Vector3(x, y, scale);
};

Projection.prototype.WGS84toWMTS = function(bbox) {

    var zoom = Math.floor(Math.log(MathExt.PI / bbox.dimension.y) / MathExt.LOG_TWO + 0.5);

    var nY = Math.pow(2, zoom);
    var nX = 2 * nY;

    var uX = MathExt.TWO_PI / nX;
    var uY = MathExt.PI / nY;

    var col = Math.floor(bbox.center.x / uX);
    var row = Math.floor(nY - (MathExt.PI_OV_TWO + bbox.center.y) / uY);

    return new CoordWMTS(zoom, row, col);
};

Projection.prototype.UnitaryToLongitudeWGS84 = function(u, projection, bbox) {
    projection.longitude = bbox.minCarto.longitude + u * bbox.dimension.x;
};

Projection.prototype.UnitaryToLatitudeWGS84 = function(v, projection, bbox) {
    projection.latitude = bbox.minCarto.latitude + v * bbox.dimension.y;
};

Projection.prototype.cartesianToGeo = function(position) {

    var p = position.clone();
    p.x = -position.x;
    p.y = position.z;
    p.z = position.y;

    var R = p.length();
    var a = 6378137;
    var b = 6356752.3142451793;
    var e = Math.sqrt((a * a - b * b) / (a * a));
    var f = 1 - Math.sqrt(1 - e * e);
    var rsqXY = Math.sqrt(p.x * p.x + p.y * p.y);

    var theta = Math.atan2(p.y, p.x);
    var nu = Math.atan(p.z / rsqXY * ((1 - f) + e * e * a / R));

    var sinu = Math.sin(nu);
    var cosu = Math.cos(nu);

    var phi = Math.atan((p.z * (1 - f) + e * e * a * sinu * sinu * sinu) / ((1 - f) * (rsqXY - e * e * a * cosu * cosu * cosu)));

    var h = (rsqXY * Math.cos(phi)) + p.z * Math.sin(phi) - a * Math.sqrt(1 - e * e * Math.sin(phi) * Math.sin(phi));

    var coord = new CoordCarto(theta, phi, h);

    return coord;
    //console.log(theta / Math.PI * 180 + ' ' + phi / Math.PI * 180 + ' ' + h);
};


Projection.prototype.wgs84_to_lambert93 = function(latitude, longitude) //, x93, y93)
    {
        /*
        rfrences :
        Mthode de calcul pour une projection de type lambert conique conforme scante (
        NTG_71.pdf):
        http://www.ign.fr/affiche_rubrique.asp?rbr_id=1700&lng_id=FR
        */

        //variables:

        //systme WGS84
        var a = 6378137; //demi grand axe de l'ellipsoide (m)
        var e = 0.08181919106; //premire excentricit de l'ellipsoide


        var deg2rad = function() {};

        //paramtres de projections
        //var l0 =deg2rad(3);
        var lc = deg2rad(3); //longitude de rfrence
        var phi0 = deg2rad(46.5); //latitude d'origine en radian
        var phi1 = deg2rad(44); //1er parallele automcoque
        var phi2 = deg2rad(49); //2eme parallele automcoque

        var x0 = 700000; //coordonnes l'origine
        var y0 = 6600000; //coordonnes l'origine

        //coordonnes du point traduire
        var phi = deg2rad(latitude);
        var l = deg2rad(longitude);

        //calcul des grandes normales
        var gN1 = a / Math.sqrt(1 - e * e * Math.sin(phi1) * Math.sin(phi1));
        var gN2 = a / Math.sqrt(1 - e * e * Math.sin(phi2) * Math.sin(phi2));

        //calculs de slatitudes isomtriques
        var gl1 = Math.log(Math.tan(Math.PI / 4 + phi1 / 2) * Math.pow((1 - e * Math.sin(phi1)) / (1 + e * Math.sin(phi1)), e / 2));

        var gl2 = Math.log(Math.tan(Math.PI / 4 + phi2 / 2) * Math.pow((1 - e * Math.sin(phi2)) / (1 + e * Math.sin(phi2)), e / 2));

        var gl0 = Math.log(Math.tan(Math.PI / 4 + phi0 / 2) * Math.pow((1 - e * Math.sin(phi0)) / (1 + e * Math.sin(phi0)), e / 2));

        var gl = Math.log(Math.tan(Math.PI / 4 + phi / 2) * Math.pow((1 - e * Math.sin(phi)) / (1 + e * Math.sin(phi)), e / 2));

        //calcul de l'exposant de la projection
        var n = (Math.log((gN2 * Math.cos(phi2)) / (gN1 * Math.cos(phi1)))) / (gl1 - gl2); //ok

        //calcul de la constante de projection
        var c = ((gN1 * Math.cos(phi1)) / n) * Math.exp(n * gl1); //ok

        //calcul des coordonnes
        var ys = y0 + c * Math.exp(-1 * n * gl0);

        //calcul des coordonnes lambert
        var x93 = x0 + c * Math.exp(-1 * n * gl) * Math.sin(n * (l - lc));
        var y93 = ys - c * Math.exp(-1 * n * gl) * Math.cos(n * (l - lc));

        return {
            x: x93,
            y: y93
        };
    }



export default Projection;
