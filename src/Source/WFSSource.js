import Source from './Source';
import URLBuilder from '../Provider/URLBuilder';

class WFSSource extends Source {
    /**
     * Features source
     * @constructor
     * @extends Source
     *
     * @param {sourceParams}  source
     * @param {string} source.typeName Name of the feature type to describe
     * @param {string} source.projection crs of wfs
     * @param {string} [source.version='2.0.2'] wfs protocol version
     * @param {Object} [source.zoom]
     * @param {number} [source.zoom.min] layer's zoom minimum
     * @param {number} [source.zoom.max] layer's zoom maximum
     *
     * @example <caption>Add color layer with wfs source</caption>
     * const colorlayer = new ColorLayer('color_build', {
     *     style: {
     *         fill: 'red',
     *         fillOpacity: 0.5,
     *         stroke: 'white',
     *     },
     *     source: {
     *        url: 'http://wxs.fr/wfs',
     *        protocol: 'wfs',
     *        version: '2.0.0',
     *        typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable',
     *        projection: 'EPSG:4326',
     *        extent: {
     *            west: 4.568,
     *            east: 5.18,
     *            south: 45.437,
     *            north: 46.03,
     *        },
     *        format: 'application/json',
     *     }
     * });
     * // Add the layer
     * view.addLayer(colorlayer);
     *
     * @example <caption>Add geometry layer with wfs source</caption>
     * const geometrylayer = new GeometryLayer('mesh_build', {
     *     update: itowns.FeatureProcessing.update,
     *     convert: itowns.Feature2Mesh.convert({ extrude: () => 50 }),
     *     source: {
     *        protocol: 'wfs',
     *        url: 'http://wxs.fr/wfs',
     *        version: '2.0.0',
     *        typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable',
     *        projection: 'EPSG:4326',
     *        extent: {
     *            west: 4.568,
     *            east: 5.18,
     *            south: 45.437,
     *            north: 46.03,
     *        },
     *        zoom: { min: 14, max: 14 },
     *        format: 'application/json',
     *     }
     * });
     * // Add the layer
     * view.addLayer(geometrylayer);
    */
    constructor(source) {
        if (!source.typeName) {
            throw new Error('source.typeName is required in wfs source.');
        }

        if (!source.projection) {
            throw new Error('source.projection is required in wfs source');
        }
        super(source);

        this.typeName = source.typeName;
        this.format = this.format || 'application/json';
        this.version = source.version || '2.0.2';

        this.url = `${source.url
        }SERVICE=WFS&REQUEST=GetFeature&typeName=${this.typeName
        }&VERSION=${this.version
        }&SRSNAME=${this.projection
        }&outputFormat=${this.format
        }&BBOX=%bbox,${this.projection}`;

        this.zoom = source.zoom || { min: 0, max: 21 };
    }

    handlingError(err, url) {
        if (err.response && err.response.status == 400) {
            return err.response.text().then((text) => {
                const getCapUrl = `${this.url}SERVICE=WFS&REQUEST=GetCapabilities&VERSION=${this.version}`;
                const xml = new DOMParser().parseFromString(text, 'application/xml');
                const errorElem = xml.querySelector('Exception');
                const errorCode = errorElem.getAttribute('exceptionCode');
                const errorMessage = errorElem.querySelector('ExceptionText').textContent;
                console.error(`Source ${this.typeName}: bad request when fetching data. Server says: "${errorCode}: ${errorMessage}". \nReviewing ${getCapUrl} may help.`, err);
                throw err;
            });
        } else {
            console.error(`Source ${this.typeName}: error while trying to fetch/parse/convert WFS data. Url was ${url}.`, err);
            throw err;
        }
    }

    urlFromExtent(extent) {
        return URLBuilder.bbox(extent.as(this.projection), this);
    }

    extentInsideLimit(extent) {
        return (extent.zoom == undefined || (extent.zoom >= this.zoom.min && extent.zoom <= this.zoom.max))
            && this.extent.intersectsExtent(extent);
    }
}

export default WFSSource;

