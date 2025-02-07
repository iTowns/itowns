import proj4 from 'proj4';

import type { ProjectionDefinition } from 'proj4';

proj4.defs('EPSG:4978', '+proj=geocent +datum=WGS84 +units=m +no_defs');

// Redefining proj4 global projections to match epsg.org database axis order.
// See https://github.com/iTowns/itowns/pull/2465#issuecomment-2517024859
proj4.defs('EPSG:4326').axis = 'neu';
proj4.defs('EPSG:4269').axis = 'neu';
proj4.defs('WGS84').axis = 'neu';

/**
 * A projection as a CRS identifier string. This identifier references a
 * projection definition previously defined with
 * [`proj4.defs`](https://github.com/proj4js/proj4js#named-projections).
 */
export type ProjectionLike = string;

function isString(s: unknown): s is string {
    return typeof s === 'string' || s instanceof String;
}

function mustBeString(crs: string) {
    if (!isString(crs)) {
        throw new Error(`Crs parameter value must be a string: '${crs}'`);
    }
}

/**
 * System units supported for a coordinate system. See
 * [proj](https://proj4.org/en/9.5/operations/conversions/unitconvert.html#angular-units).
 * Note that only degree and meters units are supported for now.
 */
export const UNIT = {
    /**
     * Angular unit in degree.
     */
    DEGREE: 1,
    /**
     * Distance unit in meter.
     */
    METER: 2,
    /**
     * Distance unit in foot.
     */
    FOOT: 3,
} as const;

/**
 * Checks that the CRS is EPSG:4326.
 * @internal
 *
 * @param crs - The CRS to test.
 */
export function is4326(crs: ProjectionLike) {
    return crs === 'EPSG:4326';
}

function unitFromProj4Unit(proj: ProjectionDefinition) {
    if (proj.units === 'degrees') {
        return UNIT.DEGREE;
    } else if (proj.units === 'm' || proj.units === 'meter') {
        return UNIT.METER;
    } else if (proj.units === 'foot') {
        return UNIT.FOOT;
    } else if (proj.units === undefined && proj.to_meter === undefined) {
        // See https://proj.org/en/9.4/usage/projections.html [17/10/2024]
        // > The default unit for projected coordinates is the meter.
        return UNIT.METER;
    } else {
        return undefined;
    }
}

/**
 * Returns the horizontal coordinates system units associated with this CRS.
 *
 * @param crs - The CRS to extract the unit from.
 * @returns Either `UNIT.METER`, `UNIT.DEGREE`, `UNIT.FOOT` or `undefined`.
 */
export function getUnit(crs: ProjectionLike) {
    mustBeString(crs);
    const p = proj4.defs(crs);
    if (!p) {
        return undefined;
    }
    return unitFromProj4Unit(p);
}

/**
 * Asserts that the CRS is using metric units.
 *
 * @param crs - The CRS to check.
 * @throws {@link Error} if the CRS is not valid.
 */
export function isMetricUnit(crs: ProjectionLike) {
    return getUnit(crs) === UNIT.METER;
}

/**
 * Asserts that the CRS is geographic.
 *
 * @param crs - The CRS to check.
 * @throws {@link Error} if the CRS is not valid.
 */
export function isGeographic(crs: ProjectionLike) {
    return getUnit(crs) === UNIT.DEGREE;
}

/**
 * Asserts that the CRS is geocentric.
 *
 * @param crs - The CRS to test.
 * @returns false if the crs isn't defined.
 */
export function isGeocentric(crs: ProjectionLike) {
    mustBeString(crs);
    const projection = proj4.defs(crs);
    return !projection ? false : projection.projName == 'geocent';
}

/**
 * Asserts that the CRS is valid, meaning it has been previously defined and
 * includes an unit.
 *
 * @param crs - The CRS to test.
 * @throws {@link Error} if the crs is not valid.
 */
export function isValid(crs: ProjectionLike) {
    const proj = proj4.defs(crs);
    if (!proj) {
        throw new Error(`Undefined crs '${crs}'. Add it with proj4.defs('${crs}', string)`);
    }
    if (!unitFromProj4Unit(proj)) {
        throw new Error(`No valid unit found for crs '${crs}', found ${proj.units}`);
    }
}

/**
 * Gives a reasonable epsilon for this CRS.
 *
 * @param crs - The CRS to use.
 * @returns 0.01 if the CRS is EPSG:4326, 0.001 otherwise.
 */
export function reasonableEpsilon(crs: ProjectionLike) {
    if (is4326(crs)) {
        return 0.01;
    } else {
        return 0.001;
    }
}

/**
 * Returns the axis parameter defined in proj4 for the provided crs.
 * Might be undefined depending on crs definition.
 *
 * @param crs - The CRS to get axis from.
 * @returns the matching proj4 axis string, 'enu' for instance (east, north, up)
 */
export function axisOrder(crs: ProjectionLike) {
    mustBeString(crs);
    const projection = proj4.defs(crs);
    return !projection ? undefined : projection.axis;
}

/**
 * Defines a proj4 projection as a named alias.
 * This function is a specialized wrapper over the
 * [`proj4.defs`](https://github.com/proj4js/proj4js#named-projections)
 * function.
 *
 * @param code - Named alias of the currently defined projection.
 * @param proj4def - Proj4 or WKT string of the defined projection.
 */
export const defs = (code: string, proj4def: string) => proj4.defs(code, proj4def);
