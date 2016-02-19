/**
 * Generated On: 2015-10-5
 * Class: IoDriver_Image
 */


define('Core/Commander/Providers/IoDriver_Image', ['Core/Commander/Providers/IoDriver', 'when'], function(IoDriver, when) {


    function IoDriver_Image() {
        //Constructor
        IoDriver.call(this);

    }

    IoDriver_Image.prototype = Object.create(IoDriver.prototype);

    IoDriver_Image.prototype.constructor = IoDriver_Image;

    IoDriver_Image.prototype.read = function(url) {
        
        // TODO new Promise is supported?       
        //return  when.promise(function(resolve, reject, notify) 
        return new Promise(function(resolve, reject) 
        {
   
            var image = new Image();
 
            image.addEventListener('load', function(event) {

                resolve(this);

            }, false);

            image.addEventListener('progress', function(event) {

            }, false);


            image.addEventListener('error', function(event) {

                //TODO bug il faut tester quand l'image n'existe pas 
                resolve(this);
                //reject(Error("Error IoDriver_Image"));        

            }, false);

            image.crossOrigin = '';
            image.src = url;
        });
    };

    return IoDriver_Image;

});
