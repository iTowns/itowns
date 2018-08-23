import Extent from '../Core/Geographic/Extent';
/**
 * @typedef {Object} NetworkOptions - Options for fetching resources over the
 * network. For json or xml fetching, this object is passed as it is to fetch
 * as the init object, see [fetch documentation]{@link https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Parameters}.
 * @property {string} crossOrigin For textures, only this property is used. Its
 * value is directly assigned to the crossorigin property of html tags.
 * @property * Same properties as the init parameter of fetch
 */

/**
 * @typedef {object} sourceParams
 * @property {string} protocol source's protocol (wmts, wms, wfs, file, tms, static)
 * @property {string} url Base URL of the repository or of the file(s) to load
 * @property {NetworkOptions} [networkOptions = { crossOrigin: 'anonymous' }] the base url to fetch data source
 * @property {string} [projection] data's projection
 * @property {Extent} [extent] data's extent
 * @property {Attribution} [attribution] Attribution The intellectual property rights for the source
 * @property {string} [format] data format
 *
 */

class Source {
    /**
     * Source are parameters to fetch source
     *
     * To extend {@link Source}, it is necessary to implement 2 functions:
     * {@link Source#urlFromExtent} and {@link Source#extentInsideLimit}
     * @param  {sourceParams}  source  object to set source
     *
     */
    constructor(source) {
        if (!source.protocol) {
            throw new Error('New Source: protocol is required');
        }

        if (!source.url) {
            throw new Error('New Source: url is required');
        }

        this.format = source.format;
        this.protocol = source.protocol;
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
     * Generate url from extent. This url is link to fetch data inside the extent.
     *
     * @param      {Extent}  extent  extent to convert in url
     * @return     {string}  url from extent
     */
    // eslint-disable-next-line
    urlFromExtent(extent) {
        throw new Error('In extented Source, you have to implement the method urlFromExtent!');
    }

    /**
     * test if the extent is inside data's source
     *
     * @param      {Extent}   extent extent to test
     * @return     {boolean}  return of test
     */
    // eslint-disable-next-line
    extentInsideLimit(extent) {
        throw new Error('In extented Source, you have to implement the method extentInsideLimit!');
    }

    /**
     * test if all extents are inside data's source
     *
     * @param      {Array.<Extent>}   extents  The extents to test
     * @return     {boolean}  test result
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
