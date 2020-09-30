import Extent from 'Core/Geographic/Extent';

const extent = new Extent('EPSG:4326', [0, 0, 0, 0]);

let subDomainsCount = 0;
function subDomains(url) {
    const subDomainsPtrn = /\$\{u:([\w-_.|]+)\}/.exec(url);

    if (!subDomainsPtrn) {
        return url;
    }

    const subDomainsList = subDomainsPtrn[1].split('|');

    return url.replace(subDomainsPtrn[0], subDomainsList[(subDomainsCount++) % subDomainsList.length]);
}

/**
 * This module performs basic operations around urls, to replace some elements
 * in it by coordinates or other things.
 *
 * In an url, it is also possible to specify subdomains alternatives using the
 * `${u:a|b|c}` pattern, by separating differents options using `|`. It will go
 * through the following alternative each time (no random). For example
 * `https://${u:xyz.org|yzx.org|zxy.org}/${z}/${x}/${y}.png` or
 * `https://${u:a|b|c}.tile.openstreetmap.org/${z}/${x}/${y}.png`.
 *
 * @module URLBuilder
 */
export default {
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
     * coords = new Extent(CRS.formatToTms('EPSG:4326'), 12, 1410, 2072);
     * source.url = 'http://server.geo/wmts/SERVICE=WMTS&TILEMATRIX=%TILEMATRIX&TILEROW=%ROW&TILECOL=%COL';
     * url = URLBuilder.xyz(coords, source);
     *
     * // The resulting url is:
     * // http://server.geo/wmts/SERVICE=WMTS&TILEMATRIX=12&TILEROW=1410&TILECOL=2072;
     *
     * @example
     * coords = new Extent('TMS', 15, 2142, 3412);
     * source.url = 'http://server.geo/tms/${z}/${y}/${x}.jpg';
     * url = URLBuilder.xyz(coords, source);
     *
     * // The resulting url is:
     * // http://server.geo/tms/15/2142/3412.jpg;
     *
     * @param {Extent} coords - the coordinates
     * @param {Source} source
     *
     * @return {string} the formed url
     */
    xyz: function xyz(coords, source) {
        return subDomains(source.url.replace(/(\$\{z\}|%TILEMATRIX)/, coords.zoom)
            .replace(/(\$\{y\}|%ROW)/, coords.row)
            .replace(/(\$\{x\}|%COL)/, coords.col));
    },

    /**
     * Builds an URL knowing the bounding box and the source to query.
     * <br><br>
     * The source object needs to have an url property, which should have the
     * string `%bbox` in it. This string will be replaced by the four cardinal
     * points composing the bounding box.
     * <br><br>
     * Order of the points can be specified in the `axisOrder` property in
     * source, using the letters `w, s, e, n` respectively for `WEST, SOUTH,
     * EAST, NORTH`. The default order is `wsen`.
     *
     * @example
     * extent = new Extent('EPSG:4326', 12, 14, 35, 46);
     * source.crs = 'EPSG:4326';
     * source.url = 'http://server.geo/wms/BBOX=%bbox&FORMAT=jpg&SERVICE=WMS';
     * url = URLBuilder.bbox(extent, source);
     *
     * // The resulting url is:
     * // http://server.geo/wms/BBOX=12,35,14,46&FORMAT=jpg&SERVICE=WMS
     *
     * @param {Extent} bbox - the bounding box
     * @param {Source} source
     *
     * @return {string} the formed url
     */
    bbox: function bbox(bbox, source) {
        const precision = source.crs == 'EPSG:4326' ? 9 : 2;
        bbox.as(source.crs, extent);
        const w = extent.west.toFixed(precision);
        const s = extent.south.toFixed(precision);
        const e = extent.east.toFixed(precision);
        const n = extent.north.toFixed(precision);

        let bboxInUnit = source.axisOrder || 'wsen';
        bboxInUnit = bboxInUnit.replace('w', `${w},`)
            .replace('s', `${s},`)
            .replace('e', `${e},`)
            .replace('n', `${n},`)
            .slice(0, -1);

        return subDomains(source.url.replace('%bbox', bboxInUnit));
    },
};
