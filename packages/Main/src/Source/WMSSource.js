import { Extent, CRS } from '@itowns/geographic';
import { bbox, subDomains } from 'Provider/URLBuilder';
import Fetcher from 'Provider/Fetcher';
import URLSource from './URLSource';

const _extent = new Extent('EPSG:4326');

/**
 * Proj provides an optional param to define axis order and orientation for a
 * given projection. 'enu' for instance stands for east, north, up.
 * Elevation is not needed here. The two first characters are sufficient to map
 * proj axis to iTowns bbox order formalism.
 * 'enu' corresponds to 'wsen' because bbox starts by lower value coordinates
 * and preserves axis ordering, here long/lat.
 */
const projAxisToBboxMappings = {
    en: 'wsen',
    es: 'wnes',
    wn: 'eswn',
    ws: 'enws',
    ne: 'swne',
    se: 'nwse',
    nw: 'senw',
    sw: 'nesw',
};

/**
 * Provides the bbox axis order matching provided proj4 axis
 * @param {string} projAxis the CRS axis order as defined in proj4
 * @returns {string} the corresponding bbox axis order to use for WMS 1.3.0
 */
function projAxisToWmsBbox(projAxis) {
    return projAxis && projAxisToBboxMappings[projAxis.slice(0, 2)] || 'wsen';
}

/**
 * An object defining the source of images to get from a
 * [WMS](http://www.opengeospatial.org/standards/wms) server. It inherits
 * from {@link Source}.
 *
 * @extends Source
 *
 * @property {boolean} isWMSSource - Used to checkout whether this source is a
 * WMSSource. Default is true. You should not change this, as it is used
 * internally for optimisation.
 * @property {string} name - The name of the layer, used in the generation of
 * the url.
 * @property {string} version - The version of the WMS server to request on.
 * Default value is '1.3.0'.
 * @property {string} style - The style to query on the WMS server. Default
 * value is 'normal'.
 * @property {number} width - The width of the image to fetch, in pixel.
 * Default value is the height if set or 256.
 * @property {number} height - The height of the image to fetch, in pixel.
 * Default value is the width if set or 256.
 * @property {string} axisOrder - The order of the axis, that helps building the
 * BBOX to put in the url requesting a resource. Default value is 'wsen', other
 * value can be 'swne'.
 * @property {boolean} transparent - Tells if the image to fetch needs
 * transparency support. Default value is false.
 * @property {Object} zoom - Object containing the minimum and maximum values of
 * the level, to zoom in the source.
 * @property {number} zoom.min - The minimum level of the source. Default value
 * is 0.
 * @property {number} zoom.max - The maximum level of the source. Default value
 * is 21.
 * @property {string} bboxDigits - The bbox digits precision used in URL
 * @property {Object} vendorSpecific - An object containing vendor specific
 * parameters. See for example a [list of these parameters for GeoServer](
 * https://docs.geoserver.org/latest/en/user/services/wms/vendor.html). This
 * object is read simply with the `key` being the name of the parameter and
 * `value` being the value of the parameter. If used, this property should be
 * set in the constructor parameters.
 *
 * @example
 * // Create the source
 * const wmsSource = new itowns.WMSSource({
 *     url: 'https://server.geo/wms',
 *     version: '1.3.0',
 *     name: 'REGION.2016',
 *     style: '',
 *     crs: 'EPSG:3857',
 *     extent: {
 *         west: '-6880639.13557728',
 *         east: '6215707.87974825',
 *         south: '-2438399.00148845',
 *         north: '7637050.03850605',
 *     },
 *     transparent: true,
 * });
 *
 * // Create the layer
 * const colorlayer = new itowns.ColorLayer('Region', {
 *     source: wmsSource,
 * });
 *
 * // Add the layer
 * view.addLayer(colorlayer);
 */
class WMSSource extends URLSource {
    /**
     * @param {Object} source - An object that can contain all properties of
     * WMSSource and {@link Source}. `url`, `name`, `extent` and `crs`
     * are mandatory.
     */
    constructor(source) {
        const {
            name,
            extent,
            crs,
            format = 'image/png',
            fetcher = Fetcher.get(format),
            parser = ((d, opt) => { d.extent = opt.extent; return d; }),
            style = '',
            width = source.height || 256,
            height = source.width || 256,
            version = '1.3.0',
            transparent = false,
            bboxDigits,
            axisOrder,
            vendorSpecific,
        } = source;

        if (!name) {
            throw new Error('[WMSSource]: source.name is required.');
        }

        if (!extent) {
            throw new Error('[WMSSource]: source.extent is required');
        }

        if (!crs) {
            throw new Error('[WMSSource]: source.crs is required');
        }

        super({ ...source, fetcher, parser });

        this.isWMSSource = true;
        this.format = format;
        this.name = name;
        this.zoom = { min: 0, max: Infinity };
        this.style = style;

        this.width = width;
        this.height = height;
        this.version = version;
        this.transparent = transparent;
        this.bboxDigits = bboxDigits;

        if (axisOrder) {
            this.axisOrder = axisOrder;
        } else if (this.version === '1.3.0') { // If not set, axis order depends on WMS version
            // Version 1.3.0 depends on CRS axis order as defined in epsg.org database
            this.axisOrder = projAxisToWmsBbox(CRS.axisOrder(this.crs));
        } else {
            // Versions 1.X.X mandate long/lat order, east-north orientation
            this.axisOrder = 'wsen';
        }

        const crsPropName = (this.version === '1.3.0') ? 'CRS' : 'SRS';

        const urlObj = new URL(this.url);
        urlObj.searchParams.set('SERVICE', 'WMS');
        urlObj.searchParams.set('REQUEST', 'GetMap');
        urlObj.searchParams.set('LAYERS', this.name);
        urlObj.searchParams.set('VERSION', this.version);
        urlObj.searchParams.set('STYLES', this.style);
        urlObj.searchParams.set('FORMAT', this.format);
        urlObj.searchParams.set('TRANSPARENT', this.transparent);
        urlObj.searchParams.set('BBOX', '%bbox');
        urlObj.searchParams.set(crsPropName, this.crs);
        urlObj.searchParams.set('WIDTH', this.width);
        urlObj.searchParams.set('HEIGHT', this.height);

        this.vendorSpecific = vendorSpecific;
        for (const name in this.vendorSpecific) {
            if (Object.prototype.hasOwnProperty.call(this.vendorSpecific, name)) {
                urlObj.searchParams.set(name, this.vendorSpecific[name]);
            }
        }

        this.url = decodeURIComponent(urlObj.toString());
    }

    urlFromExtent(extentOrTile) {
        if (extentOrTile.isTile) {
            extentOrTile = extentOrTile.toExtent(this.crs, _extent);
        }
        return subDomains(bbox(extentOrTile, this));
    }

    getDataKey(extentOrTile) {
        if (extentOrTile.isTile) {
            return `z${extentOrTile.zoom}r${extentOrTile.row}c${extentOrTile.col}`;
        } else {
            return `z${extentOrTile.zoom}s${extentOrTile.south}w${extentOrTile.west}`;
        }
    }

    extentInsideLimit(extent) {
        return this.extent.intersectsExtent(extent);
    }
}

export default WMSSource;
