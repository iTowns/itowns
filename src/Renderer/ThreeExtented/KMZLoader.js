/**
 * @author mrdoob / http://mrdoob.com/
 */

/* global THREE */

//var JSZip = require("C:/Users/vcoindet/Documents/NetBeansProjects/itownsV1/src/Renderer/ThreeExtented/jszip.min");
define('Renderer/ThreeExtented/KMZLoader', ['Renderer/ThreeExtented/jszip.min',
        'THREE',
        'Renderer/ThreeExtented/ColladaLoader',
        'Core/Commander/Providers/IoDriverXML',
        'Core/Geographic/CoordCarto',
        'when'
    ],
    function(
        JSZip,
        THREE,
        ColladaLoader,
        IoDriverXML,
        CoordCarto,
        when) {

        function KMZLoader() {

            this.colladaLoader = new THREE.ColladaLoader();
            this.colladaLoader.options.convertUpAxis = true;
            this.ioDriverXML = new IoDriverXML();
            this.cache = [];
        }

        KMZLoader.prototype = Object.create(KMZLoader.prototype);

        KMZLoader.prototype.constructor = KMZLoader;

        KMZLoader.prototype.load = function(url) {

            return new Promise(function(resolve, reject)         
            {   

                var xhr = new XMLHttpRequest();

                xhr.open("GET", url, true);

                xhr.responseType = "arraybuffer";

                xhr.crossOrigin = '';

                var scopeLoader = this.colladaLoader;

                xhr.onload = function() {

                    var zip = new JSZip(this.response);
                    var collada = undefined;
                    var coordCarto = undefined;
                    for (var name in zip.files) {
                        //console.log(name);
                        if (name.toLowerCase().substr(-4) === '.dae') {
                            collada = scopeLoader.parse(zip.file(name).asText());
                        } else if (name.toLowerCase().substr(-4) === '.kml') {

                            var parser = new DOMParser();
                            var doc = parser.parseFromString(zip.file(name).asText(), "text/xml");

                            var longitude = Number(doc.getElementsByTagName("longitude")[0].childNodes[0].nodeValue);
                            var latitude = Number(doc.getElementsByTagName("latitude")[0].childNodes[0].nodeValue);
                            var altitude = Number(doc.getElementsByTagName("altitude")[0].childNodes[0].nodeValue);

                            coordCarto = new CoordCarto().setFromDegreeGeo(latitude, longitude, altitude);

                        }
                    }

                    collada.coorCarto = coordCarto;

                    resolve(collada);

                };

                xhr.onerror = function() {

                    reject(Error("Error KMZLoader"));

                };

                xhr.send(null);

            }.bind(this));

        };

        return KMZLoader;

    });
