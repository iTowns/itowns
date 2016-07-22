/**
 * Generated On: 2015-10-5
 * Class: CoordCarto
 * Description: Coordonées cartographiques
 */

/**
 *
 * @param {type} defaultValue
 * @returns {CoordWMTS_L10.CoordWMTS}
 */
import defaultValue from 'Core/defaultValue';


/**
 *
 * @param {type} zoom
 * @param {type} row
 * @param {type} col
 * @returns {CoordWMTS_L12.CoordWMTS}
 */
function CoordWMTS(zoom, row, col) {
    this.zoom = defaultValue(zoom, 0);
    this.row = defaultValue(row, 0);
    this.col = defaultValue(col, 0);
}

CoordWMTS.prototype.constructor = CoordWMTS;

CoordWMTS.prototype.clone = function() {
    return new CoordWMTS(this.zoom, this.row, this.col);
};

CoordWMTS.prototype.isInside = function(limit) {
    return this.row >= limit.minTileRow && this.row <= limit.maxTileRow && this.col <= limit.maxTileCol && this.col >= limit.minTileCol;
};

export default CoordWMTS;
