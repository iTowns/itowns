function Provider(iodriver) {
    this.type = null;
    this._IoDriver = iodriver;
}

Provider.prototype.constructor = Provider;

/**
 * preprocessLayer will be called each time a layer is added.
 * Allows the Provider to perform precomputations on the layer
 */
Provider.prototype.preprocessLayer = function preprocessLayer(/* layer */) {

};

export default Provider;
