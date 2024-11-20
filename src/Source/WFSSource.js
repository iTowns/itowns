import Source from 'Source/Source';
import URLBuilder from 'Provider/URLBuilder';
import Extent from 'Core/Geographic/Extent';

const _extent = new Extent('EPSG:4326', [0, 0, 0, 0]);

/**
 * An object defining the source of resources to get from a
 * [WFS](http://www.opengeospatial.org/standards/wfs) server. It inherits
 * from {@link Source}.
 *
 * @extends Source
 *
 * @property {boolean} isWFSSource - Used to checkout whether this source is a
 * WFSSource. Default is true. You should not change this, as it is used
 * internally for optimisation.
 * @property {string} typeName - The name of the feature to get, used in the
 * generation of the url.
 * @property {string} version - The version of the WFS server to request on.
 * Default value is '2.0.2'.
 * @property {Object} zoom - Object containing the minimum and maximum values of
 * the level, to zoom in the source.
 * @property {number} zoom.min - The minimum level of the source. Default value
 * is 0.
 * @property {number} zoom.max - The maximum level of the source. Default value
 * is 21.
 * @property {string} bboxDigits - The bbox digits precision used in URL
 * @property {Object} vendorSpecific - An object containing vendor specific
 * parameters. See for example a [list of these parameters for GeoServer]{@link
 * https://docs.geoserver.org/latest/en/user/services/wfs/vendor.html}. This
 * object is read simply with the `key` being the name of the parameter and
 * `value` being the value of the parameter. If used, this property should be
 * set in the constructor parameters.
 *
 * @example
 * // Add color layer with WFS source
 * // Create the source
 * const wfsSource = new itowns.WFSSource({
 *     url: 'https://data.geopf.fr/wfs/ows?',
 *     version: '2.0.0',
 *     typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable',
 *     crs: 'EPSG:4326',
 *     extent: {
 *         west: 4.568,
 *         east: 5.18,
 *         south: 45.437,
 *         north: 46.03,
 *     },
 *     zoom: { min: 14, max: 14 },
 *     format: 'application/json',
 * });
 *
 * // Create the layer
 * const colorlayer = new itowns.ColorLayer('color_build', {
 *     style: {
 *         fill: 'red',
 *         fillOpacity: 0.5,
 *         stroke: 'white',
 *     },
 *     source: wfsSource,
 * });
 *
 * // Add the layer
 * view.addLayer(colorlayer);
 *
 * @example
 * // Add geometry layer with WFS source
 * // Create the source
 * const wfsSource = new itowns.WFSSource({
 *     url: 'https://data.geopf.fr/wfs/ows?',
 *     version: '2.0.0',
 *     typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable',
 *     crs: 'EPSG:4326',
 *     extent: {
 *         west: 4.568,
 *         east: 5.18,
 *         south: 45.437,
 *         north: 46.03,
 *     },
 *     zoom: { min: 14, max: 14 },
 *     format: 'application/json',
 * });
 *
 * // Create the layer
 * const geometryLayer = new itowns.FeatureGeometryLayer('mesh_build', {
 *     style: {
 *         fill: {
 *             color: new itowns.THREE.Color(0xffcc00),
 *             base_altitude: (p) => p.altitude,
 *             extrusion_height: (p) => p.height,
 *         }
 *     },
 *     source: wfsSource,
 *     zoom: { min: 14 },
 * };
 *
 * // Add the layer
 * view.addLayer(geometryLayer);
 */
class WFSSource extends Source {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * WFSSource and {@link Source}. `url`, `typeName` and `crs` are
     * mandatory.
     */
    constructor(source) {
        if (source.projection) {
            console.warn('WFSSource projection parameter is deprecated, use crs instead.');
            source.crs = source.crs || source.projection;
        }
        if (!source.typeName) {
            throw new Error('source.typeName is required in wfs source.');
        }

        if (!source.crs) {
            throw new Error('source.crs is required in wfs source');
        }

        source.format = source.format || 'application/json';

        super(source);

        this.isWFSSource = true;
        this.typeName = source.typeName;
        this.version = source.version || '2.0.2';
        this.bboxDigits = source.bboxDigits;
        this.zoom = { min: 0, max: Infinity };

        const urlObj = new URL(source.url);
        urlObj.searchParams.set('SERVICE', 'WFS');
        urlObj.searchParams.set('REQUEST', 'GetFeature');
        urlObj.searchParams.set('typeName', this.typeName);
        urlObj.searchParams.set('VERSION', this.version);
        urlObj.searchParams.set('SRSNAME', this.crs);
        urlObj.searchParams.set('outputFormat', this.format);
        urlObj.searchParams.set('BBOX', `%bbox,${this.crs}`);

        this.vendorSpecific = source.vendorSpecific;
        for (const name in this.vendorSpecific) {
            if (Object.prototype.hasOwnProperty.call(this.vendorSpecific, name)) {
                urlObj.searchParams.set(name, this.vendorSpecific[name]);
            }
        }

        this.url = decodeURIComponent(urlObj.toString());
    }

    handlingError(err) {
        if (err.response && err.response.status == 400) {
            return err.response.text().then((text) => {
                const getCapUrl = `${this.url}SERVICE=WFS&REQUEST=GetCapabilities&VERSION=${this.version}`;
                const xml = new DOMParser().parseFromString(text, 'application/xml');
                const errorElem = xml.querySelector('Exception');
                const errorCode = errorElem.getAttribute('exceptionCode');
                const errorMessage = errorElem.querySelector('ExceptionText').textContent;
                console.error(`Source ${this.typeName}: bad request when fetching data. Server says: "${errorCode}: ${errorMessage}". \nReviewing ${getCapUrl} may help.`, err);
            });
        }
        return super.handlingError(err);
    }

    requestToKey(extent) {
        if (extent.isTile) {
            return super.requestToKey(extent);
        } else {
            return [extent.zoom, extent.south, extent.west];
        }
    }

    urlFromExtent(extentOrTile) {
        const extent = extentOrTile.isExtent ?
            extentOrTile.as(this.crs, _extent) :
            extentOrTile.toExtent(this.crs, _extent);
        return URLBuilder.bbox(extent, this);
    }

    extentInsideLimit(extent) {
        return this.extent.intersectsExtent(extent);
    }
}

export default WFSSource;
