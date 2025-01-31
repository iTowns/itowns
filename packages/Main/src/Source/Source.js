import { Extent, CRS } from '@itowns/geographic';
import GeoJsonParser from 'Parser/GeoJsonParser';
import KMLParser from 'Parser/KMLParser';
import GDFParser from 'Parser/GDFParser';
import GpxParser from 'Parser/GpxParser';
import GTXParser from 'Parser/GTXParser';
import ISGParser from 'Parser/ISGParser';
import VectorTileParser from 'Parser/VectorTileParser';
import Fetcher from 'Provider/Fetcher';
// import Cache from 'Core/Scheduler/Cache';
import { LRUCache } from 'lru-cache';

/** @private */
export const supportedParsers = new Map([
    ['application/geo+json', GeoJsonParser.parse],
    ['application/json', GeoJsonParser.parse],
    ['application/kml', KMLParser.parse],
    ['application/gpx', GpxParser.parse],
    ['application/x-protobuf;type=mapbox-vector', VectorTileParser.parse],
    ['application/gtx', GTXParser.parse],
    ['application/isg', ISGParser.parse],
    ['application/gdf', GDFParser.parse],
]);

const noCache = { get: () => {}, set: a => a, clear: () => {} };

/**
 * This interface describes parsing options.
 * @typedef {Object} ParsingOptions
 * @property {Source} in - data informations contained in the file.
 * @property {FeatureBuildingOptions|Layer} out - options indicates how the features should be built.
 */

let uid = 0;

/**
 * Sources are object containing informations on how to fetch resources, from a
 * set source.
 *
 * To extend a Source, it is necessary to implement two functions:
 * `urlFromExtent` and `extentInsideLimit`.
 *
 * @extends InformationsData
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
 * `fetch()`), see [the syntax for more information](
 * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax).
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
 *  <li>an {@link ParsingOptions}  containing severals properties, set when this method is
 *  called: it is specific to each call, so the value of each property can vary
 *  depending on the current fetched tile for example</li>
 * </ul>
 */
class Source {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * Source. Only the `url` property is mandatory.
     */
    constructor(source) {
        if (source.projection) {
            console.warn('Source projection parameter is deprecated, use crs instead.');
            source.crs = source.crs || source.projection;
        }
        if (source.crs) {
            CRS.isValid(source.crs);
        }
        this.crs = source.crs;
        this.isSource = true;

        if (!source.url) {
            throw new Error('New Source: url is required');
        }

        this.uid = uid++;

        this.url = source.url;
        this.format = source.format;
        this.fetcher = source.fetcher || Fetcher.get(source.format);
        this.parser = source.parser || supportedParsers.get(source.format) || ((d, opt) => { d.extent = opt.extent; return d; });
        this.isVectorSource = (source.parser || supportedParsers.get(source.format)) != undefined;
        this.networkOptions = source.networkOptions || { crossOrigin: 'anonymous' };
        this.attribution = source.attribution;
        /** @type {Promise<any>} */
        this.whenReady = Promise.resolve();
        this._featuresCaches = {};
        if (source.extent && !(source.extent.isExtent)) {
            this.extent = new Extent(this.crs).setFromExtent(source.extent);
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

    getDataKey(extent) {
        return `z${extent.zoom}r${extent.row}c${extent.col}`;
    }

    /**
     * Load  data from cache or Fetch/Parse data.
     * The loaded data is a Feature or Texture.
     *
     * @param      {Extent}  extent   extent requested parsed data.
     * @param      {FeatureBuildingOptions|Layer}  out     The feature returned options
     * @return     {FeatureCollection|Texture}  The parsed data.
     */
    loadData(extent, out) {
        const cache = this._featuresCaches[out.crs];
        const key = this.getDataKey(extent);
        // console.log('Source.loadData', key);
        // try to get parsed data from cache
        let features = cache.get(key);
        if (!features) {
            // otherwise fetch/parse the data
            features = this.fetcher(this.urlFromExtent(extent), this.networkOptions)
                .then(file => this.parser(file, { out, in: this, extent }))
                .catch(err => this.handlingError(err));

            cache.set(key, features);
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
        if (!this._featuresCaches[options.out.crs]) {
            // Cache feature only if it's vector data, the feature are cached in source.
            // It's not necessary to cache raster in Source,
            // because it's already cached on layer.
            this._featuresCaches[options.out.crs] = this.isVectorSource ? new LRUCache({ max: 500 }) : noCache;
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
}

export default Source;
