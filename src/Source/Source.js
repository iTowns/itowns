import Extent from 'Core/Geographic/Extent';
import GeoJsonParser from 'Parser/GeoJsonParser';
import KMLParser from 'Parser/KMLParser';
import GpxParser from 'Parser/GpxParser';
import VectorTileParser from 'Parser/VectorTileParser';
import Fetcher from 'Provider/Fetcher';
import Cache from 'Core/Scheduler/Cache';

export const supportedFetchers = new Map([
    ['image/x-bil;bits=32', Fetcher.textureFloat],
    ['geojson', Fetcher.json],
    ['application/json', Fetcher.json],
    ['application/kml', Fetcher.xml],
    ['application/gpx', Fetcher.xml],
    ['application/x-protobuf;type=mapbox-vector', Fetcher.arrayBuffer],
]);

export const supportedParsers = new Map([
    ['geojson', GeoJsonParser.parse],
    ['application/json', GeoJsonParser.parse],
    ['application/kml', KMLParser.parse],
    ['application/gpx', GpxParser.parse],
    ['application/x-protobuf;type=mapbox-vector', VectorTileParser.parse],
]);


function fetchSourceData(source, extent) {
    const url = source.urlFromExtent(extent);

    return source.fetcher(url, source.networkOptions).then((f) => {
        f.extent = extent;
        return f;
    }, err => source.handlingError(err));
}

let uid = 0;

/**
 * @classdesc
 * Sources are object containing informations on how to fetch resources, from a
 * set source.
 *
 * To extend a Source, it is necessary to implement two functions:
 * `urlFromExtent` and `extentInsideLimit`.
 *
 * @property {boolean} isSource - Used to checkout whether this source is a
 * Source. Default is true. You should not change this, as it is used internally
 * for optimisation.
 * @property {number} uid - Unique uid mainly used to store data linked to this
 * source into Cache.
 * @property {string} url - The url of the resources that are fetched.
 * @property {string} format - The format of the resources that are fetched.
 * @property {function} fetcher - The method used to fetch the resources from
 * the source. iTowns provides some methods in {@link Fetcher}, but it can be
 * specified a custom one. This method should return a `Promise` containing the
 * fetched resource. If this property is set, it overrides the chosen fetcher
 * method with `format`.
 * @property {Object} networkOptions - Fetch options (passed directly to
 * `fetch()`), see [the syntax for more information]{@link
 * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax}.
 * By default, set to `{ crossOrigin: 'anonymous' }`.
 * @property {string} crs - The crs projection of the resources.
 * @property {string} attribution - The intellectual property rights for the
 * resources.
 * @property {Extent} extent - The extent of the resources.
 * @property {function} parser - The method used to parse the resources attached
 * to the layer. iTowns provides some parsers, visible in the `Parser/` folder.
 * If the method is custom, it should return a `Promise` containing the parsed
 * resource. If this property is set, it overrides the default selected parser
 * method with `source.format`. If `source.format` is also empty, no parsing
 * action is done.
 * <br><br>
 * When calling this method, two parameters are passed:
 * <ul>
 *  <li>the fetched data, i.e. the data to parse</li>
 *  <li>an object containing severals properties, set when this method is
 *  called: it is specific to each call, so the value of each property can vary
 *  depending on the current fetched tile for example</li>
 * </ul>
 *
 * The properties of the second parameter are:
 * <ul>
 *  <li>`buildExtent : boolean` - True if the layer does not inherit from {@link
 *  GeometryLayer}.</li>
 *  <li>`crsIn : string` - The crs projection of the source.</li>
 *  <li>`crsOut : string` - The crs projection of the layer.</li>
 *  <li>`filteringExtent : Extent|boolean` - If the layer inherits from {@link
 *  GeometryLayer}, it is set filtering with the extent, or extent file if it is true.</li>
 *  <li>`filter : function` - Property of the layer.</li>
 *  <li>`mergeFeatures : boolean (default true)` - Property of the layer,
 *  default to true.</li>
 *  <li>`withNormal : boolean` - True if the layer inherits from {@link
 *  GeometryLayer}.</li>
 *  <li>`withAltitude : boolean` - True if the layer inherits from {@link
 *  GeometryLayer}.</li>
 *  <li>`isInverted : string` - Property of the source.</li>
 * </ul>
 */
class Source {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * Source. Only the `url` property is mandatory.
     *
     * @constructor
     */
    constructor(source) {
        this.isSource = true;

        /* istanbul ignore next */
        if (source.projection) {
            console.warn('Source projection parameter is deprecated, use crs instead.');
            source.crs = source.crs || source.projection;
        }

        if (!source.url) {
            throw new Error('New Source: url is required');
        }

        this.uid = uid++;

        this.url = source.url;
        this.format = source.format;
        this.fetcher = source.fetcher || supportedFetchers.get(source.format) || Fetcher.texture;
        this.parser = source.parser || supportedParsers.get(source.format) || (d => d);
        this.isVectorSource = (source.parser || supportedParsers.get(source.format)) != undefined;
        this.networkOptions = source.networkOptions || { crossOrigin: 'anonymous' };
        this.crs = source.crs;
        this.attribution = source.attribution;
        this.whenReady = Promise.resolve();
        this._featuresCaches = {};
        if (source.extent && !(source.extent.isExtent)) {
            this.extent = new Extent(this.crs, source.extent);
        } else {
            this.extent = source.extent;
        }
    }

    handlingError(err) {
        throw new Error(err);
    }

    /**
     * Generates an url from an extent. This url is a link to fetch the
     * resources inside the extent.
     *
     * @param {Extent} extent - Extent to convert in url.

     * @return {string} The URL constructed from the extent.
     */
    // eslint-disable-next-line
    urlFromExtent(extent) {
        throw new Error('In extended Source, you have to implement the method urlFromExtent!');
    }

    requestToKey(extent) {
        return [extent.zoom, extent.row, extent.col];
    }

    /**
     * Load  data from cache or Fetch/Parse data.
     * The loaded data is a Feature or Texture.
     *
     * @param      {Extent}  extent   extent requested parsed data.
     * @param      {Object}  options  The parsing options
     * @return     {FeatureCollection|Texture}  The parsed data.
     */
    loadData(extent, options) {
        const cache = this._featuresCaches[options.crsOut];
        // try to get parsed data from cache
        let features = cache.getByArray(this.requestToKey(extent));
        if (!features) {
            // otherwise fetch/parse the data
            features = cache.setByArray(fetchSourceData(this, extent).then(fetchedData => this.parser(fetchedData, options),
                err => this.handlingError(err)), this.requestToKey(extent));
            /* istanbul ignore next */
            if (this.onParsedFile) {
                features.then((feat) => {
                    this.onParsedFile(feat);
                    console.warn('Source.onParsedFile was deprecated');
                    return feat;
                });
            }
        }
        return features;
    }

    /**
     * Called when layer added.
     *
     * @param {object} options
     */
    onLayerAdded(options) {
        // Added new cache by crs
        if (!this._featuresCaches[options.crsOut]) {
            this._featuresCaches[options.crsOut] = new Cache();
        }
    }

    /**
     * Called when layer removed.
     *
     * @param {options}  [options={}] options
     */
    onLayerRemoved(options = {}) {
        // delete unused cache
        const unusedCache = this._featuresCaches[options.unusedCrs];
        if (unusedCache) {
            unusedCache.clear();
            delete this._featuresCaches[options.unusedCrs];
        }
    }

    /**
     * Tests if an extent is inside the source limits.
     *
     * @param {Extent} extent - Extent to test.

     * @return {boolean} True if the extent is inside the limit, false otherwise.
     */
    // eslint-disable-next-line
    extentInsideLimit(extent) {
        throw new Error('In extented Source, you have to implement the method extentInsideLimit!');
    }

    /**
     * Tests if an array of extents is inside the source limits.
     *
     * @param {Array.<Extent>} extents - Array of extents to test.

     * @return {boolean} True if all extents are inside, false otherwise.
     */
    extentsInsideLimit(extents) {
        for (const extent of extents) {
            if (!this.extentInsideLimit(extent)) {
                return false;
            }
        }
        return true;
    }
}

export default Source;
