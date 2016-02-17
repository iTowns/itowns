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
Provider.prototype.get = function(url) {
    //TODO: Implement Me 

};


/**
 * @param url
 */
Provider.prototype.getInCache = function(url) {
    //TODO: Implement Me 

};

export default Provider;
