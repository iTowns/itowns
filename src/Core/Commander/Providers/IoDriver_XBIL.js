/**
* Generated On: 2015-10-5
* Class: IoDriver_XBIL
*/


define('Core/Commander/Providers/IoDriver_XBIL',['Core/Commander/Providers/IoDriver','when'], function(IoDriver,when){

    function IoDriver_XBIL(){
        //Constructor
        IoDriver.call( this );
        
    }
           
    IoDriver_XBIL.prototype = Object.create( IoDriver.prototype );

    IoDriver_XBIL.prototype.constructor = IoDriver_XBIL;
    
    IoDriver_XBIL.prototype.read = function(url)
    {
       
        var deferred = when.defer();

        var xhr = new XMLHttpRequest();

        xhr.open("GET", url,true);

        xhr.responseType = "arraybuffer";
        xhr.crossOrigin  = '';

        xhr.onload = function () 
        {

            var arrayBuffer = this.response; 

            if (arrayBuffer) {

                var floatArray = new Float32Array(arrayBuffer);

                
//                var max = - 1000000;
//                var min =   1000000;
                                
                var mcolor  = 0.0;
                //var mcolor  = Math.random();
 
                for (var i = 0; i < floatArray.byteLength; i++) 
                {
                   if(floatArray[i] === -99999.0 || floatArray[i] === undefined )
                        
                        floatArray[i ] = mcolor;                   
                }

                deferred.resolve(floatArray);
            }                                
        };

        xhr.onerror = function(){

            deferred.reject(Error("Error IoDriver_XBIL"));

        };

        xhr.send(null);    

        return deferred;

    
    };
    

    return IoDriver_XBIL;
    
});