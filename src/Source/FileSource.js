import Source from 'Source/Source';

import Extent from 'Core/Geographic/Extent';

const ext = new Extent('EPSG:4326', [0, 0, 0, 0]);

/**
 * @classdesc
 * An object defining the source of a single resource to get from a direct
 * access. It inherits from {@link Source}. There is multiple ways of adding a
 * resource here:
 * <ul>
 *  <li>add the file like any other sources, using the `url` property.</li>
 *  <li>fetch the file, and give the data to the source using the `fetchedData`
 *  property.</li>
 *  <li>fetch the file, parse it and git the parsed data to the source using the
 *  `parsedData` property.</li>
 * </ul>
 * See the examples below for real use cases.
 *
 * @extends Source
 *
 * @property {boolean} isFileSource - Used to checkout whether this source is a
 * FileSource. Default is true. You should not change this, as it is used
 * internally for optimisation.
 * @property {*} fetchedData - Once the file has been loaded, the resulting data
 * is stored in this property.
 * @property {*} parsedData - Once the file has been loaded and parsed, the
 * resulting data is stored in this property.
 *
 * @example <caption>Simple: create a source, a layer, and let iTowns taking
 * care of everything.</caption>
 * const kmlSource = new itowns.FileSource({
 *     url: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/croquis.kml',
 *     projection: 'EPSG:4326',
 *     fetcher: itowns.Fetcher.xml,
 *     parser: itowns.KMLParser.parse,
 * });
 *
 * const kmlLayer = new itowns.ColorLayer('Kml', {
 *     name: 'kml',
 *     transparent: true,
 *     projection: view.tileLayer.extent.crs,
 *     source: kmlSource,
 * });
 *
 * view.addLayer(kmlLayer);
 *
 * @example <caption>Advanced: fetch some data, create a source, a layer, and
 * let iTowns do the parsing and converting.</caption>
 * // Parse and Convert by iTowns
 * itowns.Fetcher.xml('https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/ULTRA2009.gpx')
 *     .then(function _(gpx) {
 *         const gpxSource = new itowns.FileSource({
 *             data: gpx,
 *             projection: 'EPSG:4326',
 *             parser: itowns.GpxParser.parse,
 *         });
 *
 *         const gpxLayer = new itowns.ColorLayer('Gpx', {
 *             name: 'Ultra 2009',
 *             transparent: true,
 *             source: gpxSource,
 *         });
 *
 *         return view.addLayer(gpxLayer);
 *     });
 *
 * @example <caption>More advanced: create a layer, fetch some data, parse the
 * data, append a source to the layer and add the layer to iTowns.</caption>
 * // Create a layer
 * const ariege = new itowns.GeometryLayer('ariege', new itowns.THREE.Group());
 *
 * // Specify update method and conversion
 * ariege.update = itowns.FeatureProcessing.update;
 * ariege.convert = itowns.Feature2Mesh.convert({
 *     color: () => new itowns.THREE.Color(0xffcc00),
 *     extrude: () => 5000,
 * });
 *
 * itowns.Fetcher.json('https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/09-ariege/departement-09-ariege.geojson')
 *     .then(function _(geojson) {
 *         return itowns.GeoJsonParser.parse(geojson, {
 *             buildExtent: true,
 *             crsIn: 'EPSG:4326',
 *             crsOut: view.tileLayer.extent.crs,
 *             mergeFeatures: true,
 *             withNormal: false,
 *             withAltitude: false,
 *         });
 *     }).then(function _(parsedData) {
 *         ariege.source = new itowns.FileSource({
 *             projection: 'EPSG:4326',
 *             parsedData,
 *         });
 *
 *         return view.addLayer(ariegeLayer);
 *     });
 */
class FileSource extends Source {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * FileSource and {@link Source}. Only `projection` is mandatory, but if it
     * presents in `parsedData` under the property `projection` or `crs`, it is
     * fine.
     * @param {string} crsOut - The projection of the output data after parsing.
     *
     * @constructor
     */
    constructor(source) {
        if (!source.projection) {
            if (source.parsedData && (source.parsedData.crs || source.parsedData.projection)) {
                source.projection = source.parsedData.crs || source.parsedData.projection;
            } else {
                throw new Error('source.projection is required in FileSource');
            }
        }

        if (!source.url && !source.fetchedData && !source.parsedData) {
            throw new Error(`url, fetchedData and parsedData are not set in
                FileSource; at least one needs to be present`);
        }

        // the fake url is for when we use the fetchedData or parsedData mode
        source.url = source.url || 'fake-file-url';
        super(source);

        this.isFileSource = true;

        this.fetchedData = source.fetchedData;
        this.parsedData = source.parsedData;
        this.zoom = source.zoom || { min: 5, max: 21 };
    }

    urlFromExtent() {
        return this.url;
    }

    onParsedFile(parsedFile) {
        this.parsedData = parsedFile;
        this.extent = parsedFile.extent;
        return parsedFile;
    }

    extentInsideLimit(extent) {
        // Fix me => may be not
        const localExtent = this.extent.crs == extent.crs ? extent : extent.as(this.extent.crs, ext);
        return (extent.zoom == undefined || !(extent.zoom < this.zoom.min || extent.zoom > this.zoom.max)) &&
            this.extent.intersectsExtent(localExtent);
    }
}

export default FileSource;
