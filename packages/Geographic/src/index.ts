// TypeDoc uses the `@module` tag to name the module.
/* eslint-disable jsdoc/check-tag-names */
/**
 * @module @itowns/geographic
 */
// Geodesic tools
export { default as Extent, type ExtentLike } from './Extent';
export { default as Coordinates, type CoordinatesLike } from './Coordinates';
export * as CRS from './Crs';
export { type ProjectionLike } from './Crs';
export { default as CoordStars } from './CoordStars';
export * as OrientationUtils from './OrientationUtils';
export { default as Ellipsoid, ellipsoidSizes } from './Ellipsoid';

