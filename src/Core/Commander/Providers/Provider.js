/**
 * Generated On: 2015-10-5
 * Class: Provider
 * Description: Generic class to serve data, local or distant, nodes and services.
 */

function Provider(iodriver) {
    //Constructor

    this.type = null;
    this._IoDriver = iodriver;

}

Provider.prototype.constructor = Provider;

/**
 * @param url
 */
Provider.prototype.get = function( /*url*/ ) {
    //TODO: Implement Me

};

/**
 * preprocessLayer will be called each time a layer is added.
 * Allows the Provider to perform precomputations on the layer
 */
Provider.prototype.preprocessLayer = function( /*layer*/ ) {

}

/**
 * @param url
 */
Provider.prototype.getInCache = function( /*url*/ ) {
    //TODO: Implement Me

};

export default Provider;
