import * as THREE from 'three';
import { Coordinates, CRS, Extent } from '@itowns/geographic';
import { getInfoTms, getCountTiles } from './TileGrid';

export interface TileLike {
    zoom: number;
    row: number;
    col: number;
}

const _tmsCoord = new THREE.Vector2();
const _dimensionTile = new THREE.Vector2();
const r = { row: 0, col: 0, invDiff: 0 };

function _rowColfromParent(tile: Tile, zoom: number) {
    const diffLevel = tile.zoom - zoom;
    const diff = 2 ** diffLevel;
    r.invDiff = 1 / diff;

    r.row = (tile.row - (tile.row % diff)) * r.invDiff;
    r.col = (tile.col - (tile.col % diff)) * r.invDiff;
    return r;
}

const _extent = new Extent('EPSG:4326');
const _extent2 = new Extent('EPSG:4326');

const _c = new Coordinates('EPSG:4326', 0, 0);

class Tile {
    readonly isTile: true;

    crs: string;
    zoom: number;
    row: number;
    col: number;

    /**
     * A tile is a geographical bounding rectangle uniquely defined by its zoom,
     * row and column.
     *
     * @param crs - projection of limit values.
     * @param zoom - `zoom` value. Default is 0.
     * @param row - `row` value. Default is 0.
     * @param col - `column` value. Default is 0.
     */
    constructor(crs: string, zoom = 0, row = 0, col = 0) {
        this.isTile = true;

        this.crs = crs;
        this.zoom = zoom;
        this.row = row;
        this.col = col;
    }

    /**
     * Returns a new tile with the same bounds and crs as this one.
     */
    clone() {
        return new Tile(this.crs, this.zoom, this.row, this.col);
    }

    /**
     * Converts this tile to the specified extent.
     * @param crs - target's projection.
     * @param target - The target to store the projected extent. If this not
     * provided a new extent will be created.
     */
    toExtent(crs: string, target = new Extent('EPSG:4326')) {
        CRS.isValid(crs);
        const { epsg, globalExtent, globalDimension } = getInfoTms(this.crs);
        const countTiles = getCountTiles(this.crs, this.zoom);

        _dimensionTile.set(1, 1).divide(countTiles).multiply(globalDimension);

        target.west = globalExtent.west +
            (globalDimension.x - _dimensionTile.x * (countTiles.x - this.col));
        target.east = target.west + _dimensionTile.x;
        target.south = globalExtent.south +
            _dimensionTile.y * (countTiles.y - this.row - 1);
        target.north = target.south + _dimensionTile.y;
        target.crs = epsg;

        return crs == epsg ? target : target.as(crs, target);
    }

    /**
     * Checks whether another tile is inside this tile.
     *
     * @param extent - the tile to check.
     */
    isInside(tile: Tile) {
        if (this.zoom == tile.zoom) {
            return this.row == tile.row &&
                this.col == tile.col;
        } else if (this.zoom < tile.zoom) {
            return false;
        } else {
            const r = _rowColfromParent(this, tile.zoom);
            return r.row == tile.row && r.col == tile.col;
        }
    }

    /**
     * Returns the translation and scale to transform this tile to the input
     * tile.
     *
     * @param tile - the input tile.
     * @param target - copy the result to target.
     */
    offsetToParent(tile: Tile, target = new THREE.Vector4()) {
        if (this.crs != tile.crs) {
            throw new Error('unsupported mix');
        }

        const r = _rowColfromParent(this, tile.zoom);
        return target.set(
            this.col * r.invDiff - r.col,
            this.row * r.invDiff - r.row,
            r.invDiff, r.invDiff);
    }

    /**
     * Returns the parent tile at the given level.
     *
     * @param levelParent - the level of the parent tile.
     */
    tiledExtentParent(levelParent: number) {
        if (levelParent && levelParent < this.zoom) {
            const r = _rowColfromParent(this, levelParent);
            return new Tile(this.crs, levelParent, r.row, r.col);
        } else {
            return this;
        }
    }

    /**
     * Sets zoom, row and column values.
     *
     * @param zoom - zoom value.
     * @param row - row value.
     * @param col - column value.
     */
    set(zoom = 0, row = 0, col = 0) {
        this.zoom = zoom;
        this.row = row;
        this.col = col;

        return this;
    }

    /**
     * Copies the passed tile to this tile.
     * @param tile - tile to copy.
     */
    copy(tile: Tile): this {
        this.crs = tile.crs;
        return this.set(tile.zoom, tile.row, tile.col);
    }

    /**
     * Return values of tile in string, separated by the separator input.
     * @param separator - string separator
     */
    toString(separator = '') {
        return `${this.zoom}${separator}${this.row}${separator}${this.col}`;
    }
}

export function tiledCovering(e: Extent, tms: string) {
    if (e.crs == 'EPSG:4326' && tms == 'EPSG:3857') {
        const WMTS_PM = [];
        const extent = _extent.copy(e).as(tms, _extent2);
        const { globalExtent, globalDimension, sTs } = getInfoTms(tms);
        extent.clampByExtent(globalExtent);
        extent.planarDimensions(_dimensionTile);

        const zoom = Math.floor(Math.log2(
            Math.round(globalDimension.x / (_dimensionTile.x * sTs.x))));
        const countTiles = getCountTiles(tms, zoom);
        const center = extent.center(_c);

        _tmsCoord.x = center.x - globalExtent.west;
        _tmsCoord.y = globalExtent.north - extent.north;
        _tmsCoord.divide(globalDimension).multiply(countTiles).floor();

        // ]N; N+1] => N
        const maxRow = Math.ceil(
            (globalExtent.north - extent.south) / globalDimension.x * countTiles.y) - 1;

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
        // ... so we count how many tiles of the same width as tile we can fit
        // in the layer
        // ... 2^zoom = tilecount => zoom = log2(tilecount)
        const zoom = Math.floor(Math.log2(
            Math.round(globalDimension.x / (_dimensionTile.x * sTs.x))));
        const countTiles = getCountTiles(tms, zoom);

        // Now that we have computed zoom, we can deduce x and y (or row /
        // column)
        _tmsCoord.x = center.x - globalExtent.west;
        _tmsCoord.y = isInverted ? globalExtent.north - center.y : center.y - globalExtent.south;
        _tmsCoord.divide(globalDimension).multiply(countTiles).floor();
        target.set(zoom, _tmsCoord.y, _tmsCoord.x);
        return [target];
    }
}

export default Tile;
