/**
 * Generated On: 2015-10-5
 * Class: IoDriver_Image
 */


import IoDriver from 'Core/Commander/Providers/IoDriver';


function IoDriver_Image() {
    //Constructor
    IoDriver.call(this);

}

IoDriver_Image.prototype = Object.create(IoDriver.prototype);

IoDriver_Image.prototype.constructor = IoDriver_Image;

IoDriver_Image.prototype.read = function(url) {

    return new Promise(function(resolve /*, reject*/ ) {

        var image = new Image();

        image.addEventListener('load', function( /*event*/ ) {

            resolve(this);

        }, false);

        image.addEventListener('progress', function( /*event*/ ) {

        }, false);


        image.addEventListener('error', function( /*event*/ ) {
            // TODO: real error managament
            resolve(undefined);
        }, false);

        image.crossOrigin = '';
        image.src = url;

    });
};

export default IoDriver_Image;
