import * as THREE from 'three';
import Coordinates from 'Core/Geographic/Coordinates';
import CRS from 'Core/Geographic/Crs';

/**
 * Extent is a SIG-area (so 2D)
 * It can use explicit coordinates (e.g: lon/lat) or implicit (WMTS coordinates)
 */

const _dim = new THREE.Vector2();
const _dim2 = new THREE.Vector2();
const _countTiles = new THREE.Vector2();
const tmsCoord = new THREE.Vector2();
const dimensionTile = new THREE.Vector2();
const defaultScheme = new THREE.Vector2(2, 2);
const r = { row: 0, col: 0, invDiff: 0 };

function _rowColfromParent(extent, zoom) {
    const diffLevel = extent.zoom - zoom;
    const diff = 2 ** diffLevel;
    r.invDiff = 1 / diff;

    r.row = (extent.row - (extent.row % diff)) * r.invDiff;
    r.col = (extent.col - (extent.col % diff)) * r.invDiff;
    return r;
}

let _extent;
let _extent2;

const cardinals = new Array(8);
for (var i = cardinals.length - 1; i >= 0; i--) {
    cardinals[i] = new Coordinates('EPSG:4326', 0, 0, 0, 0);
}

const _c = new Coordinates('EPSG:4326', 0, 0);

export const globalExtentTMS = new Map();
export const schemeTiles = new Map();

function getInfoTms(crs) {
    const epsg = CRS.formatToEPSG(crs);
    const globalExtent = globalExtentTMS.get(epsg);
    const globalDimension = globalExtent.dimensions(_dim2);
    const tms = CRS.formatToTms(crs);
    const sTs = schemeTiles.get(tms) || schemeTiles.get('default');
    // The isInverted parameter is to be set to the correct value, true or false
    // (default being false) if the computation of the coordinates needs to be
    // inverted to match the same scheme as OSM, Google Maps or other system.
    // See link below for more information
    // https://alastaira.wordpress.com/2011/07/06/converting-tms-tile-coordinates-to-googlebingosm-tile-coordinates/
    // in crs includes ':NI' => tms isn't inverted (NOT INVERTED)
    const isInverted = !tms.includes(':NI');
    return { epsg, globalExtent, globalDimension, sTs, isInverted };
}

function getCountTiles(crs, zoom) {
    const sTs = schemeTiles.get(CRS.formatToTms(crs)) || schemeTiles.get('default');
    const count = 2 ** zoom;
    _countTiles.set(count, count).multiply(sTs);
    return _countTiles;
}

class Extent {
    /**
     * Extent is geographical bounding rectangle defined by 4 limits: west, east, south and north.
     * If crs is tiled projection (WMTS or TMS), the extent is defined by zoom, row and column.
     *
     * @param {String} crs projection of limit values.
     * @param {number|Array.<number>|Coordinates|Object} v0 west value, zoom
     * value, Array of values [west, east, south and north], Coordinates of
     * west-south corner or object {west, east, south and north}
     * @param {number|Coordinates} [v1] east value, row value or Coordinates of
     * east-north corner
     * @param {number} [v2] south value or column value
     * @param {number} [v3] north value
     */
    constructor(crs, v0, v1, v2, v3) {
        this.isExtent = true;
        this.crs = crs;
        // Scale/zoom
        this.zoom = 0;

        if (CRS.isTms(this.crs)) {
            this.row = 0;
            this.col = 0;
        } else {
            this.west = 0;
            this.east = 0;
            this.south = 0;
            this.north = 0;
        }

        this.set(v0, v1, v2, v3);
    }

    /**
     * Clone this extent
     * @return {Extent} cloned extent
     */
    clone() {
        if (CRS.isTms(this.crs)) {
            return new Extent(this.crs, this.zoom, this.row, this.col);
        } else {
            return new Extent(this.crs, this.west, this.east, this.south, this.north);
        }
    }

    /**
     * get tiled extents convering this extent
     *
     * @param      {string}  crs WMTS, TMS crs
     * @return     {Array<Extent>}   array of extents covering
     */
    tiledCovering(crs) {
        if (this.crs == 'EPSG:4326' && crs == CRS.tms_3857) {
            const extents_WMTS_PM = [];
            const extent = _extent.copy(this).as(CRS.formatToEPSG(crs), _extent2);
            const { globalExtent, globalDimension, sTs } = getInfoTms(CRS.formatToEPSG(crs));
            extent.clampByExtent(globalExtent);
            extent.dimensions(dimensionTile);

            const zoom = (this.zoom + 1) || Math.floor(Math.log2(Math.round(globalDimension.x / (dimensionTile.x * sTs.x))));
            const countTiles = getCountTiles(crs, zoom);
            const center = extent.center(_c);

            tmsCoord.x = center.x - globalExtent.west;
            tmsCoord.y = globalExtent.north - extent.north;
            tmsCoord.divide(globalDimension).multiply(countTiles).floor();

            // ]N; N+1] => N
            const maxRow = Math.ceil((globalExtent.north - extent.south) / globalDimension.x * countTiles.y) - 1;

            for (let r = maxRow; r >= tmsCoord.y; r--) {
                extents_WMTS_PM.push(new Extent(crs, zoom, r, tmsCoord.x));
            }

            return extents_WMTS_PM;
        } else {
            const target = new Extent(crs, 0, 0, 0);
            const { globalExtent, globalDimension, sTs, isInverted } = getInfoTms(this.crs);
            const center = this.center(_c);
            this.dimensions(dimensionTile);
            // Each level has 2^n * 2^n tiles...
            // ... so we count how many tiles of the same width as tile we can fit in the layer
            // ... 2^zoom = tilecount => zoom = log2(tilecount)
            const zoom = Math.floor(Math.log2(Math.round(globalDimension.x / (dimensionTile.x * sTs.x))));
            const countTiles = getCountTiles(crs, zoom);

            // Now that we have computed zoom, we can deduce x and y (or row / column)
            tmsCoord.x = center.x - globalExtent.west;
            tmsCoord.y = isInverted ? globalExtent.north - center.y : center.y - globalExtent.south;
            tmsCoord.divide(globalDimension).multiply(countTiles).floor();
            target.set(zoom, tmsCoord.y, tmsCoord.x);
            return [target];
        }
    }

    /**
     * Convert Extent to the specified projection.
     * @param {string} crs the projection of destination.
     * @param {Extent} target copy the destination to target.
     * @return {Extent}
     */
    as(crs, target) {
        CRS.isValid(crs);
        target = target || new Extent('EPSG:4326', [0, 0, 0, 0]);
        if (CRS.isTms(this.crs)) {
            const { epsg, globalExtent, globalDimension } = getInfoTms(this.crs);
            const countTiles = getCountTiles(this.crs, this.zoom);

            dimensionTile.set(1, 1).divide(countTiles).multiply(globalDimension);

            target.west = globalExtent.west + (globalDimension.x - dimensionTile.x * (countTiles.x - this.col));
            target.east = target.west + dimensionTile.x;
            target.south = globalExtent.south + dimensionTile.y * (countTiles.y - this.row - 1);
            target.north = target.south + dimensionTile.y;
            target.crs = epsg;
            target.zoom = this.zoom;

            return crs == epsg ? target : target.as(crs, target);
        } else if (CRS.isEpsg(crs)) {
            if (this.crs != crs) {
                // Compute min/max in x/y by projecting 8 cardinal points,
                // and then taking the min/max of each coordinates.
                const center = this.center(_c);
                cardinals[0].setFromValues(this.west, this.north);
                cardinals[1].setFromValues(center.x, this.north);
                cardinals[2].setFromValues(this.east, this.north);
                cardinals[3].setFromValues(this.east, center.y);
                cardinals[4].setFromValues(this.east, this.south);
                cardinals[5].setFromValues(center.x, this.south);
                cardinals[6].setFromValues(this.west, this.south);
                cardinals[7].setFromValues(this.west, center.y);

                target.set(Infinity, -Infinity, Infinity, -Infinity);

                // loop over the coordinates
                for (let i = 0; i < cardinals.length; i++) {
                    // convert the coordinate.
                    cardinals[i].crs = this.crs;
                    cardinals[i].as(crs, _c);
                    target.north = Math.max(target.north, _c.y);
                    target.south = Math.min(target.south, _c.y);
                    target.east = Math.max(target.east, _c.x);
                    target.west = Math.min(target.west, _c.x);
                }

                target.zoom = this.zoom;
                target.crs = crs;
                return target;
            }

            target.crs = crs;
            target.set(this.west, this.east, this.south, this.north);

            return target;
        }
    }

    /**
     * Return the center of Extent
     * @param {Coordinates} target copy the center to the target.
     * @return {Coordinates}
     */
    center(target = new Coordinates(this.crs)) {
        if (CRS.isTms(this.crs)) {
            throw new Error('Invalid operation for WMTS bbox');
        }
        this.dimensions(_dim);

        target.crs = this.crs;
        target.setFromValues(this.west + _dim.x * 0.5, this.south + _dim.y * 0.5);

        return target;
    }

    /**
    * Returns the dimension of the extent, in a `THREE.Vector2`.
    *
    * @param {THREE.Vector2} [target] - The target to assign the result in.
    *
    * @return {THREE.Vector2}
    */
    dimensions(target = new THREE.Vector2()) {
        target.x = Math.abs(this.east - this.west);
        target.y = Math.abs(this.north - this.south);
        return target;
    }

    /**
     * Return true if `coord` is inside the bounding box.
     *
     * @param {Coordinates} coord
     * @param {number} [epsilon=0] - to take into account when comparing to the
     * point.
     *
     * @return {boolean}
     */
    isPointInside(coord, epsilon = 0) {
        if (this.crs == coord.crs) {
            _c.copy(coord);
        } else {
            coord.as(this.crs, _c);
        }

        // TODO this ignores altitude
        return _c.x <= this.east + epsilon &&
               _c.x >= this.west - epsilon &&
               _c.y <= this.north + epsilon &&
               _c.y >= this.south - epsilon;
    }

    /**
     * Return true if `extent` is inside this extent.
     *
     * @param {Extent} extent the extent to check
     * @param {number} epsilon to take into account when comparing to the
     * point.
     *
     * @return {boolean}
     */
    isInside(extent, epsilon) {
        if (CRS.isTms(this.crs)) {
            if (this.zoom == extent.zoom) {
                return this.row == extent.row &&
                    this.col == extent.col;
            } else if (this.zoom < extent.zoom) {
                return false;
            } else {
                _rowColfromParent(this, extent.zoom);
                return r.row == extent.row && r.col == extent.col;
            }
        } else {
            extent.as(this.crs, _extent);
            epsilon = epsilon == undefined ? CRS.reasonnableEpsilon(this.crs) : epsilon;
            return this.east - _extent.east <= epsilon &&
                   _extent.west - this.west <= epsilon &&
                   this.north - _extent.north <= epsilon &&
                   _extent.south - this.south <= epsilon;
        }
    }

    /**
     * Return the translation and scale to transform this extent to input extent.
     *
     * @param {Extent} extent input extent
     * @param {THREE.Vector4} target copy the result to target.
     * @return {THREE.Vector4} {x: translation on west-east, y: translation on south-north, z: scale on west-east, w: scale on south-north}
     */
    offsetToParent(extent, target = new THREE.Vector4()) {
        if (this.crs != extent.crs) {
            throw new Error('unsupported mix');
        }
        if (CRS.isTms(this.crs)) {
            _rowColfromParent(this, extent.zoom);
            return target.set(
                this.col * r.invDiff - r.col,
                this.row * r.invDiff - r.row,
                r.invDiff, r.invDiff);
        }

        extent.dimensions(_dim);
        this.dimensions(_dim2);

        const originX = (this.west - extent.west) / _dim.x;
        const originY = (extent.north - this.north) / _dim.y;

        const scaleX = _dim2.x / _dim.x;
        const scaleY = _dim2.y / _dim.y;

        return target.set(originX, originY, scaleX, scaleY);
    }

    /**
     * Return parent tiled extent with input level
     *
     * @param {number} levelParent level of parent.
     * @return {Extent}
     */
    tiledExtentParent(levelParent) {
        if (levelParent && levelParent < this.zoom) {
            _rowColfromParent(this, levelParent);
            return new Extent(this.crs, levelParent, r.row, r.col);
        } else {
            return this;
        }
    }

    /**
     * Return true if this bounding box intersect with the bouding box parameter
     * @param {Extent} extent
     * @returns {Boolean}
     */
    intersectsExtent(extent) {
        // TODO don't work when is on limit
        const other = extent.crs == this.crs ? extent : extent.as(this.crs, _extent);
        return !(this.west >= other.east ||
                 this.east <= other.west ||
                 this.south >= other.north ||
                 this.north <= other.south);
    }

    /**
     * Return the intersection of this extent with another one
     * @param {Extent} extent
     * @returns {Boolean}
     */
    intersect(extent) {
        if (!this.intersectsExtent(extent)) {
            return new Extent(this.crs, 0, 0, 0, 0);
        }
        if (extent.crs != this.crs) {
            extent = extent.as(this.crs, _extent);
        }
        return new Extent(this.crs,
            Math.max(this.west, extent.west),
            Math.min(this.east, extent.east),
            Math.max(this.south, extent.south),
            Math.min(this.north, extent.north));
    }

    /**
     * Set west, east, south and north values.
     * Or if tiled extent, set zoom, row and column values
     *
     * @param {number|Array.<number>|Coordinates|Object|Extent} v0 west value,
     * zoom value, Array of values [west, east, south and north], Extent of same
     * type (tiled or not), Coordinates of west-south corner or object {west,
     * east, south and north}
     * @param {number|Coordinates} [v1] east value, row value or Coordinates of
     * east-north corner
     * @param {number} [v2] south value or column value
     * @param {number} [v3] north value
     *
     * @return {Extent}
     */
    set(v0, v1, v2, v3) {
        if (v0 == undefined) {
            throw new Error('No values to set in the extent');
        }
        if (v0.isExtent) {
            if (CRS.isTms(v0.crs)) {
                v1 = v0.row;
                v2 = v0.col;
                v0 = v0.zoom;
            } else {
                v1 = v0.east;
                v2 = v0.south;
                v3 = v0.north;
                v0 = v0.west;
            }
        }

        if (CRS.isTms(this.crs)) {
            this.zoom = v0;
            this.row = v1;
            this.col = v2;
        } else if (v0.isCoordinates) {
            // seem never used
            this.west = v0.x;
            this.east = v1.x;
            this.south = v0.y;
            this.north = v1.y;
        } else if (v0.west !== undefined) {
            this.west = v0.west;
            this.east = v0.east;
            this.south = v0.south;
            this.north = v0.north;
        } else if (v0.length == 4) {
            this.west = v0[0];
            this.east = v0[1];
            this.south = v0[2];
            this.north = v0[3];
        } else if (v3 !== undefined) {
            this.west = v0;
            this.east = v1;
            this.south = v2;
            this.north = v3;
        }

        return this;
    }

    /**
     * Copy to this extent to input extent.
     * @param {Extent} extent
     * @return {Extent} copied extent
     */
    copy(extent) {
        this.crs = extent.crs;
        return this.set(extent);
    }

    /**
     * Union this extent with the input extent.
     * @param {Extent} extent the extent to union.
     */
    union(extent) {
        if (extent.crs != this.crs) {
            throw new Error('unsupported union between 2 diff crs');
        }
        if (this.west === Infinity) {
            this.copy(extent);
        } else {
            const west = extent.west;
            if (west < this.west) {
                this.west = west;
            }

            const east = extent.east;
            if (east > this.east) {
                this.east = east;
            }

            const south = extent.south;
            if (south < this.south) {
                this.south = south;
            }

            const north = extent.north;
            if (north > this.north) {
                this.north = north;
            }
        }
    }

    /**
     * expandByCoordinates perfoms the minimal extension
     * for the coordinates to belong to this Extent object
     * @param {Coordinates} coordinates  The coordinates to belong
     */
    expandByCoordinates(coordinates) {
        const coords = coordinates.crs == this.crs ? coordinates : coordinates.as(this.crs, _c);
        this.expandByValuesCoordinates(coords.x, coords.y);
    }

    /**
    * expandByValuesCoordinates perfoms the minimal extension
    * for the coordinates values to belong to this Extent object
    * @param {number} we  The coordinate on west-east
    * @param {number} sn  The coordinate on south-north
    *
    */
    expandByValuesCoordinates(we, sn) {
        if (we < this.west) {
            this.west = we;
        }
        if (we > this.east) {
            this.east = we;
        }
        if (sn < this.south) {
            this.south = sn;
        }
        if (sn > this.north) {
            this.north = sn;
        }
    }

    /**
     * Instance Extent with THREE.Box2
     * @param {string} crs Projection of extent to instancied.
     * @param {THREE.Box2} box
     * @return {Extent}
     */
    static fromBox3(crs, box) {
        return new Extent(crs, {
            west: box.min.x,
            east: box.max.x,
            south: box.min.y,
            north: box.max.y,
        });
    }

    /**
     * Return values of extent in string, separated by the separator input.
     * @param {string} separator
     * @return {string}
     */
    toString(separator = '') {
        if (CRS.isTms(this.crs)) {
            return `${this.zoom}${separator}${this.row}${separator}${this.col}`;
        } else {
            return `${this.east}${separator}${this.north}${separator}${this.west}${separator}${this.south}`;
        }
    }

    /**
     * Subdivide equally an extent from its center to return four extents:
     * north-west, north-east, south-west and south-east.
     *
     * @returns {Extent[]} An array containing the four sections of the extent. The
     * order of the sections is [NW, NE, SW, SE].
     */
    subdivision() {
        return this.subdivisionByScheme();
    }
    /**
     * subdivise extent by scheme.x on west-east and scheme.y on south-north.
     *
     * @param      {Vector2}  [scheme=Vector2(2,2)]  The scheme to subdivise.
     * @return     {Array<Extent>}   subdivised extents.
     */
    subdivisionByScheme(scheme = defaultScheme) {
        const subdivisedExtents = [];
        const dimSub = this.dimensions(_dim).divide(scheme);
        for (let x = scheme.x - 1; x >= 0; x--) {
            for (let y = scheme.y - 1; y >= 0; y--) {
                const west = this.west + x * dimSub.x;
                const south = this.south + y * dimSub.y;
                subdivisedExtents.push(new Extent(this.crs,
                    west,
                    west + dimSub.x,
                    south,
                    south + dimSub.y));
            }
        }
        return subdivisedExtents;
    }

    /**
     * Apply transform and copy this extent to input.  The `transformedCopy`
     * doesn't handle the issue of overflow of geographic limits.
     * @param {THREE.Vector2} t translation transform
     * @param {THREE.Vector2} s scale transform
     * @param {Extent} extent Extent to copy after transformation.
     */
    transformedCopy(t, s, extent) {
        if (!CRS.isTms(extent.crs)) {
            this.crs = extent.crs;
            this.west = (extent.west + t.x) * s.x;
            this.east = (extent.east + t.x) * s.x;
            if (this.west > this.east) {
                const temp = this.west;
                this.west = this.east;
                this.east = temp;
            }
            this.south = (extent.south + t.y) * s.y;
            this.north = (extent.north + t.y) * s.y;
            if (this.south > this.north) {
                const temp = this.south;
                this.south = this.north;
                this.north = temp;
            }
        }
    }
    /**
     * clamp south and north values
     *
     * @param      {number}  [south=this.south]  The min south
     * @param      {number}  [north=this.north]  The max north
     * @return     {Extent}  this extent
     */
    clampSouthNorth(south = this.south, north = this.north) {
        this.south = Math.max(this.south, south);
        this.north = Math.min(this.north, north);
        return this;
    }

    /**
     * clamp west and east values
     *
     * @param      {number}  [west=this.west]  The min west
     * @param      {number}  [east=this.east]  The max east
     * @return     {Extent}  this extent
     */
    clampWestEast(west = this.west, east = this.east) {
        this.west = Math.max(this.west, west);
        this.east = Math.min(this.east, east);
        return this;
    }
    /**
     * clamp this extent by passed extent
     *
     * @param      {Extent}  extent  The maximum extent.
     * @return     {Extent}  this extent.
     */
    clampByExtent(extent) {
        this.clampSouthNorth(extent.south, extent.north);
        return this.clampWestEast(extent.west, extent.east);
    }
}

_extent = new Extent('EPSG:4326', [0, 0, 0, 0]);
_extent2 = new Extent('EPSG:4326', [0, 0, 0, 0]);

globalExtentTMS.set('EPSG:4326', new Extent('EPSG:4326', -180, 180, -90, 90));

// Compute global extent of TMS in EPSG:3857
// It's square whose a side is between -180° to 180°.
// So, west extent, it's 180 convert in EPSG:3857
const extent3857 = globalExtentTMS.get('EPSG:4326').as('EPSG:3857');
extent3857.clampSouthNorth(extent3857.west, extent3857.east);
globalExtentTMS.set('EPSG:3857', extent3857);

schemeTiles.set('default', new THREE.Vector2(1, 1));
schemeTiles.set(CRS.tms_3857, schemeTiles.get('default'));
schemeTiles.set(CRS.tms_4326, new THREE.Vector2(2, 1));

export default Extent;
