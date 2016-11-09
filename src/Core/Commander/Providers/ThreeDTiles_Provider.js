/**
 * Created On: 2016-11-8
 * Class: ThreeDTiles_Provider
 * Description:
 */


import Provider from 'Core/Commander/Providers/Provider';
import CacheRessource from 'Core/Commander/Providers/CacheRessource';
import IoDriver_JSON from 'Core/Commander/Providers/IoDriver_JSON';

function ThreeDTiles_Provider(options) {
    //Constructor

    Provider.call(this, new IoDriver_JSON());
    this.cache = CacheRessource();
}

ThreeDTiles_Provider.prototype = Object.create(Provider.prototype);

ThreeDTiles_Provider.prototype.constructor = ThreeDTiles_Provider;

ThreeDTiles_Provider.prototype.removeLayer = function( /*idLayer*/ ) {

}

ThreeDTiles_Provider.prototype.preprocessDataLayer = function(layer) {

};

ThreeDTiles_Provider.prototype.getData = function(tile, layer, parameters) {

    var url = layer.url + parameters.urlSuffix;

    // TODO: ioDrive should be binary?
    return this._IoDriver.read(url).then(function(result) {
        if (result !== undefined) {
            // TODO: check magic bytes
            /*var supportedFormats = {
                'image/png':           this.getColorTexture.bind(this),
                'image/jpg':           this.getColorTexture.bind(this),
                'image/jpeg':          this.getColorTexture.bind(this),
                'image/x-bil;bits=32': this.getXbilTexture.bind(this)
            };
            var func = supportedFormats[layer.options.mimetype];*/

            console.log(url);
            result = null;
            // In RGBA elevation texture LinearFilter give some errors with nodata value.
            // need to rewrite sample function in shader
            this.cache.addRessource(url, result);

            return result;
        } else {
            this.cache.addRessource(url, null);
            return null;
        }
    }.bind(this));


}

ThreeDTiles_Provider.prototype.executeCommand = function(command) {

    var layer = command.paramsFunction.layer;
    var tile = command.requester;

    return this.getData(tile, layer, command.paramsFunction).then(function(result) {
        return command.resolve(result);
    });
};

export default ThreeDTiles_Provider;
