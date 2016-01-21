/**
 * @author mrdoob / http://mrdoob.com/
 */

/* global THREE */

//var JSZip = require("C:/Users/vcoindet/Documents/NetBeansProjects/itownsV1/src/Renderer/ThreeExtented/jszip.min");
define('Renderer/ThreeExtented/KMZLoader',['Renderer/ThreeExtented/jszip.min', 'THREE','Renderer/ThreeExtented/ColladaLoader','when'], function (JSZip, THREE,ColladaLoader, when){
    
    function KMZLoader (  ) {


        
    };
    
    KMZLoader.prototype = Object.create( KMZLoader.prototype );

    KMZLoader.prototype.constructor = KMZLoader;
    
    KMZLoader.prototype.load = function(url){
 
                              
            var deferred = when.defer();

            var xhr = new XMLHttpRequest();

            xhr.open("GET", url,true);                

            xhr.responseType = "arraybuffer";

            xhr.crossOrigin  = '';

            xhr.onload = function () 
            {
                    var zip = new JSZip( this.response );
                    var collada = undefined;
                    for ( var name in zip.files ) {
                         if ( name.toLowerCase().substr( - 4 ) ===  '.dae' ) {                           
                            collada = new THREE.ColladaLoader().parse( zip.file( name ).asText() );
                         } 
                    }
                    
                    deferred.resolve(collada);
                     
            };

            xhr.onerror = function(){

                deferred.reject(Error("Error KMZLoader"));

            };

            xhr.send(null);    

            return deferred;

    };

    return KMZLoader;
    
});