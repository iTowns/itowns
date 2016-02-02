/**
 * @author mrdoob / http://mrdoob.com/
 */

/* global THREE */

//var JSZip = require("C:/Users/vcoindet/Documents/NetBeansProjects/itownsV1/src/Renderer/ThreeExtented/jszip.min");
define('Renderer/ThreeExtented/KMZLoader',
            ['Renderer/ThreeExtented/jszip.min', 
                'THREE',
                'Renderer/ThreeExtented/ColladaLoader',
                'Core/Commander/Providers/IoDriverXML',
                'when'], 
            function (
                    JSZip, 
                    THREE,
                    ColladaLoader,
                    IoDriverXML,
                    when){
    
    function KMZLoader (  ) {

        this.colladaLoader = new THREE.ColladaLoader();               
        this.colladaLoader.options.convertUpAxis = true;
    };
    
    KMZLoader.prototype = Object.create( KMZLoader.prototype );

    KMZLoader.prototype.constructor = KMZLoader;
    
    KMZLoader.prototype.load = function(url){
 
                              
            var deferred = when.defer();

            var xhr = new XMLHttpRequest();

            xhr.open("GET", url,true);                

            xhr.responseType = "arraybuffer";

            xhr.crossOrigin  = '';
            
            var scopeLoader = this.colladaLoader;

            xhr.onload = function () 
            {
                
                    //console.log(this);
                    var zip = new JSZip( this.response );
                    var collada = undefined;
                    for ( var name in zip.files ) {
                        //console.log(name);
                        if ( name.toLowerCase().substr( - 4 ) ===  '.dae' ) {                           
                           collada = scopeLoader.parse( zip.file( name ).asText() );
                        }
                        else if (name.toLowerCase().substr( - 7 ) ===  'doc.kml'){
                           //console.log('kml found');
                           /*return this.ioDriverXML.read('doc.kml').then(function(result)
                           {
                               console.log(result);
                           });*/
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