/**
 * @author mrdoob / http://mrdoob.com/
 */

import JSZip from 'jszip';
import * as THREE from 'three';
import Coordinates from '../../Core/Geographic/Coordinates';

function KMZLoader() {
    this.colladaLoader = new THREE.ColladaLoader();
    this.colladaLoader.options.convertUpAxis = true;
    this.cache = [];
}

KMZLoader.prototype = Object.create(KMZLoader.prototype);

KMZLoader.prototype.constructor = KMZLoader;

KMZLoader.prototype.parseCollada = function parseCollada(buffer) {
    var zip = new JSZip(buffer);
    var collada;
    var coordCarto;

    for (var name in zip.files) {
        if (name.toLowerCase().substr(-4) === '.dae') {
            collada = this.colladaLoader.parse(zip.file(name).asText());
        } else if (name.toLowerCase().substr(-4) === '.kml') {
            var parser = new DOMParser();
            var doc = parser.parseFromString(zip.file(name).asText(), 'text/xml');

            var longitude = Number(doc.getElementsByTagName('longitude')[0].childNodes[0].nodeValue);
            var latitude = Number(doc.getElementsByTagName('latitude')[0].childNodes[0].nodeValue);
            var altitude = Number(doc.getElementsByTagName('altitude')[0].childNodes[0].nodeValue);

            coordCarto = new Coordinates('EPSG:4326', longitude, latitude, altitude);
        }
    }

    collada.coorCarto = coordCarto;
    return collada;
};

KMZLoader.prototype.load = function load(url) {
    return fetch(url).then((response) => {
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`Error loading ${url}: status ${response.status}`);
        }
        return response.arrayBuffer();
    }).then(buffer => this.parseCollada(buffer));
};

export default KMZLoader;
