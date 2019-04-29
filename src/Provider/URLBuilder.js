import Extent from 'Core/Geographic/Extent';

const extent = new Extent('EPSG:4326', [0, 0, 0, 0]);
/**
 * @module URLBuilder
 */
export default {
    /**
     * Builds an URL knowing the coordinates and the layer to query.
     * <br><br>
     * The layer object needs to have an url property, which should have some
     * specific strings that will be replaced by coordinates.
     * <ul>
     * <li>`${x}` or `%COL` will be replaced by `coords.col`</li>
     * <li>`${y}` or `%ROW` will be replaced by `coords.row`</li>
     * <li>`${z}` or `%TILEMATRIX` will be replaced by `coords.zoom`</li>
     * </ul>
     *
     * @example
     * coords = new Coordinates('WMTS:WGS84', 12, 1410, 2072);
     * layer.url = 'http://server.geo/wmts/SERVICE=WMTS&TILEMATRIX=%TILEMATRIX&TILEROW=%ROW&TILECOL=%COL';
     * url = URLBuilder.xyz(coords, layer);
     *
     * // The resulting url is:
     * // http://server.geo/wmts/SERVICE=WMTS&TILEMATRIX=12&TILEROW=1410&TILECOL=2072;
     *
     * @example
     * coords = new Extent('TMS', 15, 2142, 3412);
     * layer.url = 'http://server.geo/tms/${z}/${y}/${x}.jpg';
     * url = URLBuilder.xyz(coords, layer);
     *
     * // The resulting url is:
     * // http://server.geo/tms/15/2142/3412.jpg;
     *
     * @param {Extent} coords - the coordinates
     * @param {Layer} layer
     *
     * @return {string} the formed url
     */
    xyz: function xyz(coords, layer) {
        return layer.url.replace(/(\$\{z\}|%TILEMATRIX)/, coords.zoom)
            .replace(/(\$\{y\}|%ROW)/, coords.row)
            .replace(/(\$\{x\}|%COL)/, coords.col);
    },

    /**
     * Builds an URL knowing the bounding box and the layer to query.
     * <br><br>
     * The layer object needs to have an url property, which should have the
     * string `%bbox` in it. This string will be replaced by the four cardinal
     * points composing the bounding box.
     * <br><br>
     * Order of the points can be specified in the `axisOrder` property in
     * layer, using the letters `w, s, e, n` respectively for `WEST, SOUTH,
     * EAST, NORTH`. The default order is `wsen`.
     *
     * @example
     * extent = new Extent('EPSG:4326', 12, 14, 35, 46);
     * layer.projection = 'EPSG:4326';
     * layer.url = 'http://server.geo/wms/BBOX=%bbox&FORMAT=jpg&SERVICE=WMS';
     * url = URLBuilder.bbox(extent, layer);
     *
     * // The resulting url is:
     * // http://server.geo/wms/BBOX=12,35,14,46&FORMAT=jpg&SERVICE=WMS
     *
     * @param {Extent} bbox - the bounding box
     * @param {Layer} layer
     *
     * @return {string} the formed url
     */
    bbox: function bbox(bbox, layer) {
        const precision = layer.projection == 'EPSG:4326' ? 9 : 2;
        bbox.as(layer.projection, extent);
        const w = extent.west.toFixed(precision);
        const s = extent.south.toFixed(precision);
        const e = extent.east.toFixed(precision);
        const n = extent.north.toFixed(precision);

        let bboxInUnit = layer.axisOrder || 'wsen';
        bboxInUnit = bboxInUnit.replace('w', `${w},`)
            .replace('s', `${s},`)
            .replace('e', `${e},`)
            .replace('n', `${n},`)
            .slice(0, -1);

        return layer.url.replace('%bbox', bboxInUnit);
    },
};
