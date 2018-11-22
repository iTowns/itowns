import Extent from '../Core/Geographic/Extent';

/**
 * @classdesc
 * Sources are object containing informations on how to fetch resources, from a
 * set source.
 *
 * To extend a Source, it is necessary to implement two functions: {@link
 * Source#urlFromExtent} and {@link Source#extentInsideLimit}.
 *
 * @property {boolean} isSource - Used to checkout whether this source is a
 * Source. Default is true. You should not change this, as it is used internally
 * for optimisation.
 * @property {string} url - The url of the resources that are fetched.
 * @property {string} format - The format of the resources that are fetched.
 * @property {Object} networkOptions - Fetch options (passed directly to
 * <code>fetch()</code>), see {@link
 * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax|the
 * syntax for more information}. By default, set to <code>{ crossOrigin:
 * 'anonymous' }</code>.
 * @property {string} projection - The projection of the resources.
 * @property {string} attribution - The intellectual property rights for the
 * resources.
 * @property {Extent} extent - The extent of the resources.
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
