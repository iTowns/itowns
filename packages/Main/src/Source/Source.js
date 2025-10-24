import { Extent, CRS } from '@itowns/geographic';

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
    constructor(source = {}) {
        if (source.crs) {
            CRS.isValid(source.crs);
        }
        this.crs = source.crs;
        this.isSource = true;
        this.uid = uid++;

        this.attribution = source.attribution;
        /** @type {Promise<any>} */
        this.whenReady = Promise.resolve();
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

    // eslint-disable-next-line
    getDataKey(extent) {
        throw new Error('In extended Source, you have to implement the method getDataKey!');
    }

    // eslint-disable-next-line
    loadData(extent, out) {
        throw new Error('In extended Source, you have to implement the method loadData!');
    }

    /**
     * Called when layer added.
     *
     * @param {object} options
     */
    // eslint-disable-next-line
    onLayerAdded(options) {}

    /**
     * Called when layer removed.
     *
     * @param {options}  [options={}] options
     */
    // eslint-disable-next-line
    onLayerRemoved(options = {}) {}

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
