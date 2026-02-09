import proj4 from 'proj4';
import type { Converter } from 'proj4';
import type { ProjectionDefinition } from 'proj4/dist/lib/defs';

type proj4Def = {
    type: string,
    PROJCS: proj4Def,
    unknown?: string,
    (alias: string): proj4Def & { name: string },
    title: string,
}

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

const proj4Cache: Record<string, Record<string, Converter>> = {};
export function transform(crsIn: ProjectionLike, crsOut: ProjectionLike): Converter {
    if (!proj4Cache[crsIn]) {
        proj4Cache[crsIn] = {};
    }

    if (!proj4Cache[crsIn][crsOut]) {
        proj4Cache[crsIn][crsOut] = proj4(crsIn, crsOut);
    }

    return proj4Cache[crsIn][crsOut];
}

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
    } else if (proj.units === 'foot' || proj.units === 'ft') {
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
        throw new Error(`Undefined crs '${crs}'. Add it with itowns.CRS.defs('${crs}', wktString)`);
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
 * This function is an alias for the
 * [`proj4.defs`](https://github.com/proj4js/proj4js#named-projections) function.
 */
export const defs = proj4.defs;

/**
 * Fetches a CRS definition from epsg.io and registers it with proj4.
 * If the CRS is already defined, returns the existing definition.
 *
 * @param crs - The EPSG code string (e.g. "EPSG:2154").
 * @returns The proj4 projection definition.
 *
 * @example
 * // Register EPSG:2154 (RGF93 / Lambert-93)
 * await CRS.fromEPSG('EPSG:2154');
 *
 * // Register EPSG:4269 (NAD83)
 * await CRS.fromEPSG('EPSG:4269');
 */
export async function fromEPSG(crs: string): Promise<ProjectionDefinition> {
    const def = proj4.defs(crs);
    if (def) {
        return def;
    }

    const code = crs.replace(/^EPSG:/i, '');
    const response = await fetch(`https://epsg.io/${code}.proj4`);
    if (!response.ok) {
        throw new Error(`Failed to fetch EPSG:${code} from epsg.io: ${response.status}`);
    }

    const proj4def = await response.text();
    proj4.defs(crs, proj4def);
    return proj4.defs(crs);
}

export function defsFromWkt(wkt: string) {
    proj4.defs('unknown', wkt);
    const proj4Defs = proj4.defs as unknown as proj4Def;
    let projCS;
    if (proj4Defs('unknown').type === 'COMPD_CS') {
        console.warn('Compound coordinate system is not yet supported.');
        projCS = proj4Defs('unknown').PROJCS;
    } else {
        projCS = proj4Defs('unknown');
    }
    const crsAlias = projCS.title || projCS.name || 'EPSG:XXXX';
    if (!(crsAlias in proj4.defs)) {
        proj4.defs(crsAlias, projCS);
    }
    delete proj4Defs.unknown;
    return crsAlias;
}
