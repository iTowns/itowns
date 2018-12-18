import Source from 'Source/Source';
import URLBuilder from 'Provider/URLBuilder';

/**
 * @classdesc
 * An object defining the source of images to get from a
 * [WMS]{@link http://www.opengeospatial.org/standards/wms} server. It inherits
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
 * @property {Object} vendorSpecific - An object containing vendor specific
 * parameters. See for example a [list of these parameters for GeoServer]{@link
 * https://docs.geoserver.org/latest/en/user/services/wms/vendor.html}. This
 * object is read simply with the <code>key</code> being the name of the
 * parameter and <code>value</code> being the value of the parameter. If used,
 * this property should be set in the constructor parameters.
 *
 * @example
 * // Create the source
 * const wmsSource = new itowns.WMSSource({
 *     url: 'https://server.geo/wms',
 *     version: '1.3.0',
 *     name: 'REGION.2016',
 *     style: '',
 *     projection: 'EPSG:3857',
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
class WMSSource extends Source {
    /**
     * @param {Object} source - An object that can contain all properties of
     * WMSSource and {@link Source}. <code>url</code>, <code>name</code>,
     * <code>extent</code> and <code>projection</code> are mandatory.
     *
     * @constructor
     */
    constructor(source) {
        if (!source.name) {
            throw new Error('source.name is required.');
        }

        if (!source.extent) {
            throw new Error('source.extent is required');
        }

        if (!source.projection) {
            throw new Error('source.projection is required');
        }
        super(source);

        this.isWMSSource = true;
        this.name = source.name;
        this.zoom = source.zoom || { min: 0, max: 21 };
        this.format = this.format || 'image/png';
        this.style = source.style || '';

        // TODO: remove in 2.7.0
        if (source.heightMapWidth) {
            console.warn('source.heightMapWidth is deprecated, please use source.width instead.');
            source.width = source.width || source.heightMapWidth;
        }

        this.width = source.width || source.height || 256;
        this.height = source.height || source.width || 256;
        this.version = source.version || '1.3.0';
        this.transparent = source.transparent || false;

        if (!source.axisOrder) {
        // 4326 (lat/long) axis order depends on the WMS version used
            if (source.projection == 'EPSG:4326') {
            // EPSG 4326 x = lat, long = y
            // version 1.1.0 long/lat while version 1.3.0 mandates xy (so lat,long)
                this.axisOrder = (this.version === '1.1.0' ? 'wsen' : 'swne');
            } else {
            // xy,xy order
                this.axisOrder = 'wsen';
            }
        }

        const crsPropName = (this.version === '1.3.0') ? 'CRS' : 'SRS';

        this.url = `${source.url}?SERVICE=WMS&REQUEST=GetMap&LAYERS=${
            this.name}&VERSION=${
            this.version}&STYLES=${
            this.style}&FORMAT=${
            this.format}&TRANSPARENT=${
            this.transparent}&BBOX=%bbox&${
            crsPropName}=${
            this.projection}&WIDTH=${this.width}&HEIGHT=${this.height}`;

        this.vendorSpecific = source.vendorSpecific;
        for (const name in this.vendorSpecific) {
            if (Object.prototype.hasOwnProperty.call(this.vendorSpecific, name)) {
                this.url = `${this.url}&${name}=${this.vendorSpecific[name]}`;
            }
        }
    }

    urlFromExtent(extent) {
        return URLBuilder.bbox(extent, this);
    }

    extentInsideLimit(extent) {
        const localExtent = this.projection == extent.crs() ? extent : extent.as(this.projection);
        return (extent.zoom == undefined || !(extent.zoom < this.zoom.min || extent.zoom > this.zoom.max)) &&
            this.extent.intersectsExtent(localExtent);
    }
}

export default WMSSource;
