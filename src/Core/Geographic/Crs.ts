import proj4 from 'proj4';

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

function _unitFromProj4Unit(projunit: string) {
    if (projunit === 'degrees') {
        return UNIT.DEGREE;
    } else if (projunit === 'm') {
        return UNIT.METER;
    } else {
        return undefined;
    }
}

function toUnit(crs: ProjectionLike) {
    mustBeString(crs);
    switch (crs) {
        case 'EPSG:4326' : return UNIT.DEGREE;
        case 'EPSG:4978' : return UNIT.METER;
        default: {
            const p = proj4.defs(formatToEPSG(crs));
            if (!p?.units) {
                return undefined;
            }
            return _unitFromProj4Unit(p.units);
        }
    }
}

function toUnitWithError(crs: ProjectionLike) {
    mustBeString(crs);
    const u = toUnit(crs);
    if (u === undefined) {
        throw new Error(`No unit found for crs: '${crs}'`);
    }
    return u;
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
        toUnitWithError(crs);
    },

    /**
     * Assert that the CRS is geographic.
     *
     * @param crs - The CRS to validate.
     * @throws {@link Error} if the CRS is not valid.
     */
    isGeographic(crs: ProjectionLike) {
        return (toUnitWithError(crs) == UNIT.DEGREE);
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
