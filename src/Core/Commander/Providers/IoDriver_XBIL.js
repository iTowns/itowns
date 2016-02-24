/**
 * Generated On: 2015-10-5
 * Class: IoDriver_XBIL
 */


define('Core/Commander/Providers/IoDriver_XBIL', ['Core/Commander/Providers/IoDriver', 'when'], function(IoDriver, when) {


    var portableXBIL = function(buffer) {
        this.floatArray = new Float32Array(buffer);
        this.max = -1000000;
        this.min = 1000000;
        this.texture = -1;
    };


    function IoDriver_XBIL() {
        //Constructor
        IoDriver.call(this);

    }

    IoDriver_XBIL.prototype = Object.create(IoDriver.prototype);

    IoDriver_XBIL.prototype.constructor = IoDriver_XBIL;

   IoDriver_XBIL.prototype.read = function(url) {

        // TODO new Promise is supported?
  
        //return when.promise(function(resolve, reject) 
        return new Promise(function(resolve, reject) 
        {
            var xhr = new XMLHttpRequest();

            xhr.open("GET", url, true);

            xhr.responseType = "arraybuffer";
            xhr.crossOrigin = '';

            xhr.onload = function() {

                var arrayBuffer = this.response;

                if (arrayBuffer) {

                    var result = new portableXBIL(arrayBuffer);
                    // Compute min max using subampling
                    for (var i = 0; i < result.floatArray.byteLength; i+=64) {
                        var val = result.floatArray[i];                   
                        if (val > -10.0 && val !== undefined){
                            result.max = Math.max(result.max, val);
                            result.min = Math.min(result.min, val);
                        }
                    }
                    if (result.min === 1000000)
                        return resolve(undefined);

                    resolve(result);
                }
            };

            xhr.onerror = function() {

                resolve(undefined);
            };

            xhr.send(null);

        });


    };


    return IoDriver_XBIL;

});
