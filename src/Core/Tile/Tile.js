import * as THREE from 'three';
import * as CRS from '../Geographic/Crs';
import Coordinates from '../Geographic/Coordinates';
import Extent from '../Geographic/Extent';
import { getInfoTms, getCountTiles } from './TileGrid';

const _tmsCoord = new THREE.Vector2();
const _dimensionTile = new THREE.Vector2();
const r = { row: 0, col: 0, invDiff: 0 };

function _rowColfromParent(/** @type {Tile} */ tile, /** @type {number} */ zoom) {
    const diffLevel = tile.zoom - zoom;
    const diff = 2 ** diffLevel;
    r.invDiff = 1 / diff;

    r.row = (tile.row - (tile.row % diff)) * r.invDiff;
    r.col = (tile.col - (tile.col % diff)) * r.invDiff;
    return r;
}

const _extent = new Extent('EPSG:4326', [0, 0, 0, 0]);
const _extent2 = new Extent('EPSG:4326', [0, 0, 0, 0]);

const _c = new Coordinates('EPSG:4326', 0, 0);

class Tile {
    /**
     * Tile is a geographical bounding rectangle defined by zoom, row and column.
     *
     * @param {String} crs projection of limit values.
     * @param {number} [zoom=0] zoom value
     * @param {number} [row=0] row value
     * @param {number} [col=0] column value
     */
    constructor(crs, zoom = 0, row = 0, col = 0) {
        this.isTile = true;

        this.crs = crs;
        this.zoom = zoom;
        this.row = row;
        this.col = col;
    }

    /**
     * Clone this tile
     * @return {Tile} cloned tile
     */
    clone() {
        return new Tile(this.crs, this.zoom, this.row, this.col);
    }

    /**
     * Convert tile to the specified extent.
     * @param {string} crs the projection of destination.
     * @param {Extent} target copy the destination to target.
     * @return {Extent}
     */
    toExtent(crs, target) {
        CRS.isValid(crs);
        target = target || new Extent('EPSG:4326', [0, 0, 0, 0]);
        const { epsg, globalExtent, globalDimension } = getInfoTms(this.crs);
        const countTiles = getCountTiles(this.crs, this.zoom);

        _dimensionTile.set(1, 1).divide(countTiles).multiply(globalDimension);

        target.west = globalExtent.west + (globalDimension.x - _dimensionTile.x * (countTiles.x - this.col));
        target.east = target.west + _dimensionTile.x;
        target.south = globalExtent.south + _dimensionTile.y * (countTiles.y - this.row - 1);
        target.north = target.south + _dimensionTile.y;
        target.crs = epsg;
        target.zoom = this.zoom;

        return crs == epsg ? target : target.as(crs, target);
    }

    /**
     * Return true if `tile` is inside this tile.
     *
     * @param {Tile} tile the tile to check
     *
     * @return {boolean}
     */
    isInside(tile) {
        if (this.zoom == tile.zoom) {
            return this.row == tile.row &&
                this.col == tile.col;
        } else if (this.zoom < tile.zoom) {
            return false;
        } else {
            _rowColfromParent(this, tile.zoom);
            return r.row == tile.row && r.col == tile.col;
        }
    }

    /**
     * Return the translation and scale to transform this tile to input tile.
     *
     * @param {Tile} tile input tile
     * @param {THREE.Vector4} target copy the result to target.
     * @return {THREE.Vector4} {x: translation on west-east, y: translation on south-north, z: scale on west-east, w: scale on south-north}
     */
    offsetToParent(tile, target = new THREE.Vector4()) {
        if (this.crs != tile.crs) {
            throw new Error('unsupported mix');
        }

        _rowColfromParent(this, tile.zoom);
        return target.set(
            this.col * r.invDiff - r.col,
            this.row * r.invDiff - r.row,
            r.invDiff, r.invDiff);
    }

    /**
     * Return parent tile with input level
     *
     * @param {number} levelParent level of parent.
     * @return {Tile}
     */
    tiledExtentParent(levelParent) {
        if (levelParent && levelParent < this.zoom) {
            _rowColfromParent(this, levelParent);
            return new Tile(this.crs, levelParent, r.row, r.col);
        } else {
            return this;
        }
    }

    /**
     * Set zoom, row and column values
     *
     * @param {number} [zoom=0] zoom value
     * @param {number} [row=0] row value
     * @param {number} [col=0] column value
     *
     * @return {Tile}
     */
    set(zoom = 0, row = 0, col = 0) {
        this.zoom = zoom;
        this.row = row;
        this.col = col;

        return this;
    }

    /**
     * Copy to this tile to input tile.
     * @param {Tile} tile
     * @return {Tile} copied extent
     */
    copy(tile) {
        this.crs = tile.crs;
        return this.set(tile.zoom, tile.row, tile.col);
    }

    /**
     * Return values of tile in string, separated by the separator input.
     * @param {string} separator
     * @return {string}
     */
    toString(separator = '') {
        return `${this.zoom}${separator}${this.row}${separator}${this.col}`;
    }
}

/**
 * @param {Extent} e
 * @param {string} tms
 * @returns {Tile[]}
 */
export function tiledCovering(e, tms) {
    if (e.crs == 'EPSG:4326' && tms == 'EPSG:3857') {
        const WMTS_PM = [];
        const extent = _extent.copy(e).as(tms, _extent2);
        const { globalExtent, globalDimension, sTs } = getInfoTms(tms);
        extent.clampByExtent(globalExtent);
        extent.planarDimensions(_dimensionTile);

        const zoom = (e.zoom + 1) || Math.floor(Math.log2(Math.round(globalDimension.x / (_dimensionTile.x * sTs.x))));
        const countTiles = getCountTiles(tms, zoom);
        const center = extent.center(_c);

        _tmsCoord.x = center.x - globalExtent.west;
        _tmsCoord.y = globalExtent.north - extent.north;
        _tmsCoord.divide(globalDimension).multiply(countTiles).floor();

        // ]N; N+1] => N
        const maxRow = Math.ceil((globalExtent.north - extent.south) / globalDimension.x * countTiles.y) - 1;

        for (let r = maxRow; r >= _tmsCoord.y; r--) {
            WMTS_PM.push(new Tile(tms, zoom, r, _tmsCoord.x));
        }

        return WMTS_PM;
    } else {
        const target = new Tile(tms, 0, 0, 0);
        const { globalExtent, globalDimension, sTs, isInverted } = getInfoTms(e.crs);
        const center = e.center(_c);
        e.planarDimensions(_dimensionTile);
        // Each level has 2^n * 2^n tiles...
        // ... so we count how many tiles of the same width as tile we can fit in the layer
        // ... 2^zoom = tilecount => zoom = log2(tilecount)
        const zoom = Math.floor(Math.log2(Math.round(globalDimension.x / (_dimensionTile.x * sTs.x))));
        const countTiles = getCountTiles(tms, zoom);

        // Now that we have computed zoom, we can deduce x and y (or row / column)
        _tmsCoord.x = center.x - globalExtent.west;
        _tmsCoord.y = isInverted ? globalExtent.north - center.y : center.y - globalExtent.south;
        _tmsCoord.divide(globalDimension).multiply(countTiles).floor();
        target.set(zoom, _tmsCoord.y, _tmsCoord.x);
        return [target];
    }
}

export default Tile;
