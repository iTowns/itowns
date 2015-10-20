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

                var byteArray = new Float32Array(arrayBuffer);
                var size = 256*256;
                var rgbaData = new Float32Array( 4 * size );
                
                //var mcolor      = new THREE.Color(Math.floor(Math.random()*255),Math.floor(Math.random()*255),Math.floor(Math.random()*255));
                var mcolor      = 1.0;//Math.random();

                for (var i = 0; i < byteArray.byteLength; i++) 
                {
                   if(byteArray[i] === -99999.0 || byteArray[i] === undefined )
                   {
                        rgbaData[i * 4  + 3] = 1.0;
                        rgbaData[i * 4  + 2] = mcolor;
                        rgbaData[i * 4  + 1] = mcolor;
                        rgbaData[i * 4  + 0] = mcolor;
                   //     byteArray[i] = 0.0;                  
                   }
                   else
                   {
                        rgbaData[i * 4  + 3] = 1.0;
                        rgbaData[i * 4  + 2] = Math.floor(byteArray[i])/2500.0;
                        rgbaData[i * 4  + 1] = Math.floor(byteArray[i])/2500.0;
                        rgbaData[i * 4  + 0] = Math.floor(byteArray[i])/2500.0;
                   }
                   
                }

                //var texture = new THREE.DataTexture(rgbaData,256,256,THREE.RGBAFormat,THREE.FloatType);

                //texture.needsUpdate = true;
                deferred.resolve(rgbaData);
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