/**
 * Generated On: 2015-10-5
 * Class: IoDriver_XBIL
 */
/* global Float32Array*/

define('Core/Commander/Providers/IoDriver_XBIL', ['Core/Commander/Providers/IoDriver','when'], function(IoDriver,when) {


    var portableXBIL = function(buffer) {
        this.floatArray = new Float32Array(buffer);
        this.max = -1000000;
        this.min = 1000000;
        this.texture = -1;
        this.level = -1;
    };


    function IoDriver_XBIL() {
        //Constructor
        IoDriver.call(this);

    }

    IoDriver_XBIL.prototype = Object.create(IoDriver.prototype);

    IoDriver_XBIL.prototype.constructor = IoDriver_XBIL;

    IoDriver_XBIL.prototype.parseXBil = function(buffer) {

//        var parseMinMax = function(result,start,length) {
//
//            for (var i = start; i <  length; i++) {
//                var val = result.floatArray[i];
//                if (val > -10.0 && val !== undefined){
//                    result.max = Math.max(result.max, val);
//                    result.min = Math.min(result.min, val);
//                }
//            }
//        };

        if (buffer){

            var result = new portableXBIL(buffer);
            // Compute min max using subampling
            for (var i = 0; i < result.floatArray.length; i+=16) {
                var val = result.floatArray[i];
                if (val > -10.0 && val !== undefined){
                    result.max = Math.max(result.max, val);
                    result.min = Math.min(result.min, val);
                }
            }

            /*
            var subSize = result.floatArray.length/64;

            var arrayP = [];

            for (var i = 0; i < result.floatArray.length; i+= subSize )
            {
                arrayP.push(when(parseMinMax(result,i,subSize)));
            }

            when.all(arrayP);
            */
            if (result.max === -1000000)
                return undefined;

            return result;
        }
        else
            return undefined;
    };

    IoDriver_XBIL.prototype.parseMinMax = function(result/*,start,length*/) {

        for (var i = 0; i < result.floatArray.length; i++) {
            var val = result.floatArray[i];
            if (val > -10.0 && val !== undefined){
                result.max = Math.max(result.max, val);
                result.min = Math.min(result.min, val);
            }
        }
    };

    IoDriver_XBIL.prototype.read = function(url) {

        // TODO new Promise is supported? not in IE

        return when.promise(function(resolve/*, reject*/)
        //return new Promise(function(resolve/*, reject*/)
        {
            var xhr = new XMLHttpRequest();
            resolve.xhr = xhr; // avoid deletion by garbage collector


            //The responseType property cannot be set when the XMLHttpRequest is not async, that is, synchronous.
            //Setting the third parameter of open to false causes the request to be synchronous.
            //xhr.open("GET", url, false);
            xhr.responseType = "arraybuffer";
            xhr.crossOrigin = '';
            xhr["parseXBil"] = this.parseXBil;

            xhr.onload = function() {

                resolve(this.parseXBil(this.response));

            };

            xhr.onerror = function() {

                resolve(undefined);

                this.abort();
            };

            xhr.open("GET", url, true);
            xhr.send(null);

        }.bind(this));
    };


    return IoDriver_XBIL;

});
