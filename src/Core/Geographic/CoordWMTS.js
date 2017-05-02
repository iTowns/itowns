/**
 *
 * @param {type} zoom
 * @param {type} row
 * @param {type} col
 * @returns {CoordWMTS_L12.CoordWMTS}
 */
function CoordWMTS(zoom, row, col) {
    this.zoom = zoom || 0;
    this.row = row || 0;
    this.col = col || 0;
}

CoordWMTS.prototype.constructor = CoordWMTS;

CoordWMTS.prototype.clone = function cloneCoord() {
    return new CoordWMTS(this.zoom, this.row, this.col);
};

CoordWMTS.prototype.isInside = function isInside(limit) {
    return this.row >= limit.minTileRow && this.row <= limit.maxTileRow && this.col <= limit.maxTileCol && this.col >= limit.minTileCol;
};

CoordWMTS.prototype.equals = function equals(coordWMTS) {
    return this.row === coordWMTS.row && this.zoom === coordWMTS.zoom && this.col === coordWMTS.col;
};

export default CoordWMTS;
