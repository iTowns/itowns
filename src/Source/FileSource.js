import Source from 'Source/Source';
import Cache from 'Core/Scheduler/Cache';

/**
 * An object defining the source of a single resource to get from a direct
 * access. It inherits from {@link Source}. There is multiple ways of adding a
 * resource here:
 * <ul>
 *  <li>add the file like any other sources, using the `url` property.</li>
 *  <li>fetch the file, and give the data to the source using the `fetchedData`
 *  property.</li>
 *  <li>fetch the file, parse it and git the parsed data to the source using the
 *  `features` property.</li>
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
 * @property {*} features - Once the file has been loaded and parsed, the
 * resulting data is stored in this property.
 *
 * @example <caption>Simple: create a source, a layer, and let iTowns taking
 * care of everything.</caption>
 * const kmlSource = new itowns.FileSource({
 *     url: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/croquis.kml',
 *     crs: 'EPSG:4326',
 *     fetcher: itowns.Fetcher.xml,
 *     parser: itowns.KMLParser.parse,
 * });
 *
 * const kmlLayer = new itowns.ColorLayer('Kml', {
 *     name: 'kml',
 *     transparent: true,
 *     crs: view.tileLayer.extent.crs,
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
 *             crs: 'EPSG:4326',
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
 *             in: { crs: 'EPSG:4326' },
 *             out: { crs: view.tileLayer.extent.crs,
 *                      style: new itowns.Style({
 *                          fill: {
 *                              color: new itowns.THREE.Color(0xffcc00),
 *                              extrusion_height: () => 5000,
 *                      }),
 *                  },
 *             },
 *         });
 *     }).then(function _(features) {
 *         ariege.source = new itowns.FileSource({
 *             crs: 'EPSG:4326',
 *             features,
 *         });
 *
 *         return view.addLayer(ariegeLayer);
 *     });
 */
class FileSource extends Source {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * FileSource and {@link Source}. Only `crs` is mandatory, but if it
     * presents in `features` under the property `crs`, it is fine.
     */
    constructor(source) {
        if (source.parsedData) {
            console.warn('FileSource parsedData parameter is deprecated, use features instead of.');
            source.features = source.features || source.parsedData;
        }
        if (source.projection) {
            console.warn('FileSource projection parameter is deprecated, use crs instead.');
            source.crs = source.crs || source.projection;
        }
        if (!source.crs) {
            if (source.features && source.features.crs) {
                source.crs = source.features.crs;
            } else {
                throw new Error('source.crs is required in FileSource');
            }
        }

        if (!source.url && !source.fetchedData && !source.features) {
            throw new Error(`url, fetchedData and features are not set in
                FileSource; at least one needs to be present`);
        }

        // the fake url is for when we use the fetchedData or features mode
        source.url = source.url || 'none';
        super(source);

        this.isFileSource = true;

        this.fetchedData = source.fetchedData;
        if (!this.fetchedData && !source.features) {
            this.whenReady = this.fetcher(this.urlFromExtent(), this.networkOptions).then((f) => {
                this.fetchedData = f;
            });
        } else if (source.features) {
            this._featuresCaches[source.features.crs] = new Cache();
            this._featuresCaches[source.features.crs].setByArray(Promise.resolve(source.features), [0]);
        }

        this.whenReady.then(() => this.fetchedData);

        this.zoom = { min: 0, max: Infinity };
    }

    urlFromExtent() {
        return this.url;
    }

    onLayerAdded(options) {
        options.in = this;
        super.onLayerAdded(options);
        let features = this._featuresCaches[options.out.crs].getByArray([0]);
        if (!features) {
            options.out.buildExtent = this.crs != 'EPSG:4978';
            if (options.out.buildExtent) {
                options.out.forcedExtentCrs = options.out.crs != 'EPSG:4978' ? options.out.crs : this.crs;
            }
            features = this.parser(this.fetchedData, options);
            this._featuresCaches[options.out.crs].setByArray(features, [0]);
        }
        features.then((data) => {
            if (data.extent) {
                this.extent = data.extent.clone();
                // Transform local extent to data.crs projection.
                if (this.extent.crs == data.crs) {
                    this.extent.applyMatrix4(data.matrixWorld);
                }
            }
        });
    }

    /**
     * load  data from cache or Fetch/Parse data.
     * The loaded data is a Feature or Texture.
     *
     * @param      {Extent}  extent   extent requested parsed data.
     * @param      {FeatureBuildingOptions|Layer}  out  The feature returned options
     * @return     {FeatureCollection|Texture}  The parsed data.
     */
    loadData(extent, out) {
        return this._featuresCaches[out.crs].getByArray([0]);
    }

    extentInsideLimit(extent) {
        return this.extent.intersectsExtent(extent);
    }
}

export default FileSource;
