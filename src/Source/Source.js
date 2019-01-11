import Extent from 'Core/Geographic/Extent';

/**
 * @classdesc
 * Sources are object containing informations on how to fetch resources, from a
 * set source.
 *
 * To extend a Source, it is necessary to implement two functions:
 * <code>urlFromExtent</code> and <code>extentInsideLimit</code>.
 *
 * @property {boolean} isSource - Used to checkout whether this source is a
 * Source. Default is true. You should not change this, as it is used internally
 * for optimisation.
 * @property {string} url - The url of the resources that are fetched.
 * @property {string} format - The format of the resources that are fetched.
 * @property {function} fetcher - The method used to fetch the resources from
 * the source. iTowns provides some methods in {@link Fetcher}, but it can be
 * specified a custom one. This method should return a <code>Promise</code>
 * containing the fetched resource. If this property is set, it overrides the
 * chosen fetcher method with <code>format</code>.
 * @property {Object} networkOptions - Fetch options (passed directly to
 * <code>fetch()</code>), see [the syntax for more information]{@link
 * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax}.
 * By default, set to <code>{ crossOrigin: 'anonymous' }</code>.
 * @property {string} projection - The projection of the resources.
 * @property {string} attribution - The intellectual property rights for the
 * resources.
 * @property {Extent} extent - The extent of the resources.
 * @property {function} parser - The method used to parse the resources attached
 * to the layer. iTowns provides some parsers, visible in the
 * <code>Parser/</code> folder. If the method is custom, it should return a
 * <code>Promise</code> containing the parsed resource. If this property is set,
 * it overrides the default selected parser method with
 * <code>source.format</code>. If <code>source.format</code> is also empty, no
 * parsing action is done.
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
 *  <li><code>buildExtent : boolean</code> - True if the layer does not inherit
 *  from {@link GeometryLayer}.</li>
 *  <li><code>crsIn : string</code> - The projection of the source.</li>
 *  <li><code>crsOut : string</code> - The projection of the layer.</li>
 *  <li><code>filteringExtent : Extent</code> - If the layer inherits from
 *  {@link GeometryLayer}, it is set to the extent of destination, otherwise it
 *  is undefined.</li>
 *  <li><code>filter : function</code> - Property of the layer.</li>
 *  <li><code>mergeFeatures : boolean (default true)</code> - Property of the
 *  layer, default to true.</li>
 *  <li><code>withNormal : boolean</code> - True if the layer inherits from
 *  {@link GeometryLayer}.</li>
 *  <li><code>withAltitude : boolean</code> - True if the layer inherits from
 *  {@link GeometryLayer}.</li>
 *  <li><code>isInverted : string</code> - Property of the source.</li>
 * </ul>
 */
class Source {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * Source. Only the <code>url</code> property is mandatory.
     *
     * @constructor
     */
    constructor(source) {
        this.isSource = true;

        if (!source.url) {
            throw new Error('New Source: url is required');
        }

        this.url = source.url;
        this.format = source.format;
        this.fetcher = source.fetcher;
        this.parser = source.parser;
        this.networkOptions = source.networkOptions || { crossOrigin: 'anonymous' };
        this.projection = source.projection;
        this.attribution = source.attribution;
        if (source.extent && !(source.extent instanceof Extent)) {
            if (Array.isArray(source.extent)) {
                this.extent = new Extent(this.projection, ...source.extent);
            } else {
                this.extent = new Extent(this.projection, source.extent);
            }
        } else {
            this.extent = source.extent;
        }
    }

    handlingError(err) {
        console.warn(`err ${this}`, err);
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
        throw new Error('In extented Source, you have to implement the method urlFromExtent!');
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
