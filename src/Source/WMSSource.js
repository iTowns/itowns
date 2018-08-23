import Source from './Source';
import URLBuilder from '../Provider/URLBuilder';

class WMSSource extends Source {
    /**
     * Images source
     * @constructor
     * @extends Source
     * @param {sourceParams}  source
     * @param {string} source.name name of layer wms
     * @param {Extent} source.extent extent of wms source
     * @param {string} [source.style=''] style of layer wms
     * @param {number} [source.heightMapWidth=256] size texture in pixel
     * @param {string} [source.version='1.3.0'] wms version
     * @param {string} [source.axisOrder] wms axis order ('wsen' or 'swne')
     * @param {boolean} [source.transparent=false] source return texture with transparence
     * @param {Object} [source.zoom]
     * @param {number} [source.zoom.min] layer's zoom minimum
     * @param {number} [source.zoom.max] layer's zoom maximum
     *
     * @example <caption>Add color layer with wms source</caption>
     * const colorlayer = new ColorLayer('Region', {
     *     source: {
     *         url: 'https://wxs.fr/wms',
     *         protocol: 'wms',
     *         version: '1.3.0',
     *         name: 'REGION.2016',
     *         style: '',
     *         projection: 'EPSG:3857',
     *         extent: {
     *             west: '-6880639.13557728',
     *             east: '6215707.87974825',
     *             south: '-2438399.00148845',
     *             north: '7637050.03850605',
     *         },
     *         transparent: true,
     *     },
     * });
     * // Add the layer
     * view.addLayer(colorlayer);
     *
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

        this.name = source.name;
        this.zoom = source.zoom || { min: 0, max: 21 };
        this.format = this.format || 'image/png';
        this.style = source.style || '';
        this.width = source.heightMapWidth || 256;
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
            this.projection}&WIDTH=${this.width}&HEIGHT=${this.width}`;
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
