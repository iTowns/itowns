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

                    //                var floatArray = new Float32Array(arrayBuffer);                
                    //                var max = - 1000000;
                    //                var min =   1000000;

                    var result = new portableXBIL(arrayBuffer);

                    var mcolor = 0.0;
                    //var mcolor  = Math.random();


                    for (var i = 0; i < result.floatArray.byteLength; i++) {
                        var val = result.floatArray[i];
                        //  TODO debug a voir avec le geoportail
                        //if(val === -99999.0 || val === undefined )                        
                        if (val < -10.0 || val === undefined)
                            result.floatArray[i] = mcolor;
                        else {
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

                //console.log('error bil');
                resolve(undefined);
                //reject(Error("Error IoDriver_XBIL"));

            };

            xhr.send(null);

        });


    };


    return IoDriver_XBIL;

});
