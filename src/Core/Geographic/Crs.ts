import proj4 from 'proj4';

import type { ProjectionDefinition } from 'proj4';

proj4.defs('EPSG:4978', '+proj=geocent +datum=WGS84 +units=m +no_defs');

/**
 * A projection as a CRS identifier string.
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

function isTms(crs: string) {
    return isString(crs) && crs.startsWith('TMS');
}

function isEpsg(crs: string) {
    return isString(crs) && crs.startsWith('EPSG');
}

function formatToTms(crs: string) {
    mustBeString(crs);
    return isTms(crs) ? crs : `TMS:${crs.match(/\d+/)?.[0]}`;
}

function formatToEPSG(crs: string) {
    mustBeString(crs);
    return isEpsg(crs) ? crs : `EPSG:${crs.match(/\d+/)?.[0]}`;
}

const UNIT = {
    DEGREE: 1,
    METER: 2,
} as const;

function is4326(crs: ProjectionLike) {
    return crs === 'EPSG:4326';
}

function isGeocentric(crs: ProjectionLike) {
    mustBeString(crs);
    const projection = proj4.defs(crs);
    return !projection ? false : projection.projName == 'geocent';
}

function unitFromProj4Unit(proj: ProjectionDefinition) {
    if (proj.units === 'degrees') {
        return UNIT.DEGREE;
    } else if (proj.units === 'm') {
        return UNIT.METER;
    } else if (proj.units === undefined && proj.to_meter === undefined) {
        // See https://proj.org/en/9.4/usage/projections.html [17/10/2024]
        // > The default unit for projected coordinates is the meter.
        return UNIT.METER;
    } else {
        return undefined;
    }
}

function toUnit(crs: ProjectionLike) {
    mustBeString(crs);
    const p = proj4.defs(formatToEPSG(crs));
    if (!p) {
        return undefined;
    }
    return unitFromProj4Unit(p);
}

/**
 * This module provides basic methods to manipulate a CRS.
 */
export default {
    /**
     * Units that can be used for a CRS.
     */
    UNIT,

    /**
     * Assert that the CRS is a valid one.
     *
     * @param crs - The CRS to validate.
     *
     * @throws {@link Error} if the CRS is not valid.
     */
    isValid(crs: ProjectionLike) {
        const proj = proj4.defs(crs);
        if (!proj) {
            throw new Error(`Undefined crs '${crs}'. Add it with proj4.defs('${crs}', string)`);
        }
        if (!unitFromProj4Unit(proj)) {
            throw new Error(`No valid unit found for crs '${crs}', found ${proj.units}`);
        }
    },

    /**
     * Assert that the CRS is geographic.
     *
     * @param crs - The CRS to validate.
     * @throws {@link Error} if the CRS is not valid.
     */
    isGeographic(crs: ProjectionLike) {
        return (toUnit(crs) == UNIT.DEGREE);
    },

    /**
     * Assert that the CRS is using metric units.
     *
     * @param crs - The CRS to validate.
     * @throws {@link Error} if the CRS is not valid.
     */
    isMetricUnit(crs: ProjectionLike) {
        return (toUnit(crs) == UNIT.METER);
    },

    /**
     * Get the unit to use with the CRS.
     *
     * @param crs - The CRS to get the unit from.
     * @returns Either `UNIT.METER`, `UNIT.DEGREE` or `undefined`.
     */
    toUnit,

    /**
     * Is the CRS EPSG:4326?
     *
     * @param crs - The CRS to test.
     */
    is4326,
    /**
     * Is the CRS geocentric?
     * if crs isn't defined the method returns false.
     *
     * @param crs - The CRS to test.
     */
    isGeocentric,

    /**
     * Give a reasonnable epsilon to use with this CRS.
     *
     * @param crs - The CRS to use.
     * @returns 0.01 if the CRS is EPSG:4326, 0.001 otherwise.
     */
    reasonnableEpsilon(crs: ProjectionLike) {
        if (is4326(crs)) {
            return 0.01;
        } else {
            return 0.001;
        }
    },
    /**
     * Format crs to European Petroleum Survey Group notation: EPSG:XXXX.
     *
     * @param crs - The crs to format
     * @returns formated crs
     */
    formatToEPSG,
    /**
     * Format crs to tile matrix set notation: TMS:XXXX.
     *
     * @param crs - The crs to format
     * @returns formated crs
     */
    formatToTms,
    isTms,
    isEpsg,
    tms_3857: 'TMS:3857',
    tms_4326: 'TMS:4326',
    /**
     * Define a proj4 projection as a string and reference.
     *
     * @param code - projection's SRS code (only used internally by the Proj4js
     * library)
     * @param proj4def - Proj4 definition string for the projection to use
     */
    defs: (code: string, proj4def: string) => proj4.defs(code, proj4def),
};
