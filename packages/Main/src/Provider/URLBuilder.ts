import { TileLike } from 'Core/Tile/Tile';

let subDomainsCount = 0;

interface ExtentLike {
    west: number;
    south: number;
    east: number;
    north: number;
}

interface TileSource {
    readonly url: string;
    readonly tileMatrixCallback: (zoom: number) => string;
}

interface ExtentSource {
    readonly url: string;
    readonly crs: string;
    readonly bboxDigits?: number;
    readonly axisOrder?: string;
}

/**
 * Builds an URL from a subdomain template.
 * <br><br>
 * The template uses the pattern `${u:subdomain1|subdomain2|subdomain3}` where
 * subdomains are separated by `|`. Each call to this function will cycle
 * through the subdomains in sequence, returning the next one in the list.
 * <br><br>
 * For example, `${u:a|b|c}` will be replaced by `a`, then `b`, then `c`, and
 * then loop back to `a`.
 *
 * @example
 * ```
 * const url = 'https://${u:a|b|c}.tile.openstreetmap.org/';
 * const urlWithSubdomains = subDomains(url);
 * // First call returns 'https://a.tile.openstreetmap.org/'
 * // Second call returns 'https://b.tile.openstreetmap.org/'
 * // Third call returns 'https://c.tile.openstreetmap.org/'
 * // And so on...
 * ```
 *
 * @param url - The URL to process for subdomains
 * @returns The URL with subdomain replacement applied
 */
export function subDomains(url: string): string {
    const subDomainsPtrn = /\$\{u:([\w-_.|]+)\}/.exec(url);

    if (!subDomainsPtrn) {
        return url;
    }

    const subDomainsList = subDomainsPtrn[1].split('|');

    return url.replace(
        subDomainsPtrn[0],
        subDomainsList[(subDomainsCount++) % subDomainsList.length],
    );
}

/**
 * Builds an URL knowing the coordinates and the source to query.
 * <br><br>
 * The source object needs to have an url property, which should have some
 * specific strings that will be replaced by coordinates.
 * <ul>
 * <li>`${x}` or `%COL` will be replaced by `coords.col`</li>
 * <li>`${y}` or `%ROW` will be replaced by `coords.row`</li>
 * <li>`${z}` or `%TILEMATRIX` will be replaced by `coords.zoom`</li>
 * </ul>
 *
 * @example
 * ```
 * coords = new Extent(CRS.formatToTms('EPSG:4326'), 12, 1410, 2072);
 * source.url = 'http://server.geo/wmts/SERVICE=WMTS&TILEMATRIX=%TILEMATRIX&TILEROW=%ROW&TILECOL=%COL';
 * url = xyz(coords, source);
 *
 * // The resulting url is:
 * // http://server.geo/wmts/SERVICE=WMTS&TILEMATRIX=12&TILEROW=1410&TILECOL=2072;
 * ```
 * @example
 * ```
 * coords = new Extent('TMS', 15, 2142, 3412);
 * source.url = 'http://server.geo/tms/${z}/${y}/${x}.jpg';
 * url = xyz(coords, source);
 *
 * // The resulting url is:
 * // http://server.geo/tms/15/2142/3412.jpg;
 * ```
 * @param coords - tile coordinates
 * @param source - the source object (url and tileMatrixCallback)
 *
 * @returns the formed url
 */
export function xyz(coords: TileLike, source: TileSource): string {
    return source.url.replace(/(\$\{z\}|%TILEMATRIX)/, source.tileMatrixCallback(coords.zoom))
        .replace(/(\$\{y\}|%ROW)/, coords.row.toString())
        .replace(/(\$\{x\}|%COL)/, coords.col.toString());
}

/**
 * Builds an URL knowing the bounding box and the source to query.
 * <br><br>
 * The source object needs to have an url property, which should have the
 * string `%bbox` in it. This string will be replaced by the four cardinal
 * points composing the bounding box.
 * <br><br>
 * Order of the points can be specified in the `axisOrder` property in
 * source, using the letters `w, s, e, n` respectively for
 * `WEST, SOUTH, EAST, NORTH`. The default order is `wsen`.
 *
 * @example
 * ```
 * extent = new Extent('EPSG:4326', 12, 14, 35, 46);
 * source.crs = 'EPSG:4326';
 * source.url = 'http://server.geo/wms/BBOX=%bbox&FORMAT=jpg&SERVICE=WMS';
 * url = bbox(extent, source);
 *
 * // The resulting url is:
 * // http://server.geo/wms/BBOX=12,35,14,46&FORMAT=jpg&SERVICE=WMS
 * ```
 * @param bbox - the bounding box (west, south, east, north)
 * @param source - the source of data (url, crs, bboxDigits and axisOrder)
 *
 * @returns the formed url
 */
export function bbox(bbox: ExtentLike, source: ExtentSource): string {
    let precision = source.crs == 'EPSG:4326' ? 9 : 2;
    if (source.bboxDigits !== undefined) {
        precision = source.bboxDigits;
    }
    const w = bbox.west.toFixed(precision);
    const s = bbox.south.toFixed(precision);
    const e = bbox.east.toFixed(precision);
    const n = bbox.north.toFixed(precision);

    let bboxInUnit = source.axisOrder || 'wsen';
    bboxInUnit = bboxInUnit.replace('w', `${w},`)
        .replace('s', `${s},`)
        .replace('e', `${e},`)
        .replace('n', `${n},`)
        .slice(0, -1);

    return source.url.replace('%bbox', bboxInUnit);
}
