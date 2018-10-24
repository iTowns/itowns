import Source from './Source';
import URLBuilder from '../Provider/URLBuilder';
import Extent from '../Core/Geographic/Extent';

class TMSSource extends Source {
    /**
     * Tiled images source
     * @constructor
     * @extends Source
     * @param {sourceParams}  source
     * @param {string} [source.origin] origin row coordinate: 'top' or 'bottom'
     * @param {Object} [source.zoom]
     * @param {number} [source.zoom.min] layer's zoom minimum
     * @param {number} [source.zoom.max] layer's zoom maximum
     * @param {string} [source.tileMatrixSet='WGS84']  define tile matrix set of tms layer (ex: 'PM', 'WGS84')
     *
     * @example <caption>Add color layer with tms source</caption>
     * const colorlayer = new ColorLayer('OPENSM', {
     *     source: {
     *         protocol: 'xyz',
     *         format: 'image/png',
     *         url: 'http://osm.io/styles/${z}/${x}/${y}.png',
     *         attribution: {
     *             name: 'OpenStreetMap',
     *             url: 'http://www.openstreetmap.org/',
     *         },
     *         tileMatrixSet: 'PM',
     *     }
     * });
     * // Add the layer
     * view.addLayer(colorlayer);
    */
    constructor(source) {
        super(source);
        if (!source.extent) {
        // default to the full 3857 extent
            this.extent = new Extent('EPSG:3857',
                -20037508.342789244, 20037508.342789244,
                -20037508.342789255, 20037508.342789244);
        }

        this.zoom = source.zoom || { min: 0, max: 18 };

        this.origin = source.origin || (source.protocol == 'xyz' ? 'top' : 'bottom');

        this.format = this.format || 'image/png';
        this.url = source.url;
        if (source.tileMatrixSet) {
            this.tileMatrixSet = source.tileMatrixSet;
        } else if (this.projection == 'EPSG:3857') {
            this.tileMatrixSet = 'PM';
        } else {
            this.tileMatrixSet = 'WGS84';
        }
    }

    urlFromExtent(extent) {
        return URLBuilder.xyz(extent, this);
    }

    handlingError(err) {
        console.warn(`err ${this.url}`, err);
    }

    extentInsideLimit(extent) {
        // This layer provides data starting at level = layer.source.zoom.min
        // (the zoom.max property is used when building the url to make
        //  sure we don't use invalid levels)
        // TODO: add extent limit
        return extent.zoom >= this.zoom.min && extent.zoom <= this.zoom.max;
    }
}

export default TMSSource;
