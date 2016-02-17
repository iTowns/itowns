/**
 * @author mrdoob / http://mrdoob.com/
 */

/* global THREE */

//var JSZip = require("C:/Users/vcoindet/Documents/NetBeansProjects/itownsV1/src/Renderer/ThreeExtented/jszip.min");
import JSZip from 'Renderer/ThreeExtented/jszip.min';
import THREE from 'THREE';
import ColladaLoader from 'Renderer/ThreeExtented/ColladaLoader';
import IoDriverXML from 'Core/Commander/Providers/IoDriverXML';
import CoordCarto from 'Core/Geographic/CoordCarto';
import when from 'when';

function KMZLoader() {

    this.colladaLoader = new THREE.ColladaLoader();
    this.colladaLoader.options.convertUpAxis = true;
    this.ioDriverXML = new IoDriverXML();
    this.cache = [];
};

KMZLoader.prototype = Object.create(KMZLoader.prototype);

KMZLoader.prototype.constructor = KMZLoader;

KMZLoader.prototype.load = function(url) {


    var deferred = when.defer();

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

        deferred.resolve(collada);

    };

    xhr.onerror = function() {

        deferred.reject(Error("Error KMZLoader"));

    };

    xhr.send(null);

    return deferred;

};

export default KMZLoader;
