import * as THREE from 'three';
import Extent from '../Geographic/Extent';

const _countTiles = new THREE.Vector2();
const _dim = new THREE.Vector2();

export const globalExtentTMS = new Map();
export const schemeTiles = new Map();

const extent4326 = new Extent('EPSG:4326', -180, 180, -90, 90);
globalExtentTMS.set('EPSG:4326', extent4326);

// Compute global extent of TMS in EPSG:3857
// It's square whose a side is between -180° to 180°.
// So, west extent, it's 180 convert in EPSG:3857
const extent3857 = extent4326.as('EPSG:3857');
extent3857.clampSouthNorth(extent3857.west, extent3857.east);
globalExtentTMS.set('EPSG:3857', extent3857);

schemeTiles.set('default', new THREE.Vector2(1, 1));
schemeTiles.set('EPSG:3857', schemeTiles.get('default'));
schemeTiles.set('EPSG:4326', new THREE.Vector2(2, 1));

export function getInfoTms(/** @type {string} */ crs) {
    const globalExtent = globalExtentTMS.get(crs);
    const globalDimension = globalExtent.planarDimensions(_dim);
    const sTs = schemeTiles.get(crs) || schemeTiles.get('default');
    // The isInverted parameter is to be set to the correct value, true or false
    // (default being false) if the computation of the coordinates needs to be
    // inverted to match the same scheme as OSM, Google Maps or other system.
    // See link below for more information
    // https://alastaira.wordpress.com/2011/07/06/converting-tms-tile-coordinates-to-googlebingosm-tile-coordinates/
    // in crs includes ':NI' => tms isn't inverted (NOT INVERTED)
    const isInverted = !crs.includes(':NI');
    return { epsg: crs, globalExtent, globalDimension, sTs, isInverted };
}

export function getCountTiles(/** @type {string} */ crs, /** @type {number} */ zoom) {
    const sTs = schemeTiles.get(crs) || schemeTiles.get('default');
    const count = 2 ** zoom;
    _countTiles.set(count, count).multiply(sTs);
    return _countTiles;
}
