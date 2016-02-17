/**
 * Generated On: 2015-10-5
 * Class: IoDriver_Image
 */


import IoDriver from 'Core/Commander/Providers/IoDriver';
import when from 'when';


function IoDriver_Image() {
    //Constructor
    IoDriver.call(this);

}

IoDriver_Image.prototype = Object.create(IoDriver.prototype);

IoDriver_Image.prototype.constructor = IoDriver_Image;

IoDriver_Image.prototype.read = function(url) {

    var deferred = when.defer();
    var image = new Image();

    image.addEventListener('load', function(event) {

        deferred.resolve(this);

    }, false);

    image.addEventListener('progress', function(event) {

    }, false);


    image.addEventListener('error', function(event) {


        //TODO bug il faut tester quand l'image n'existe pas 
        deferred.resolve(this);
        //deferred.reject(Error("Error IoDriver_Image"));        

    }, false);

    image.crossOrigin = '';
    image.src = url;

    return deferred;

};

export default IoDriver_Image;
