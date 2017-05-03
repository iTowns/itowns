/**
 * Class: KML_Provider
 * Description: Provide geometry out of KML
 */
/* global Promise*/

import * as THREE from 'three';
import Togeojson from 'togeojson';
import Provider from './Provider';
import Fetcher from './Fetcher';
import FeatureToolBox from '../../../Renderer/ThreeExtented/FeatureToolBox';
import Layer from '../../../Scene/Layer';

function KML_Provider() {
    this.cache = new Map();
    this.featureToolBox = null;
}

KML_Provider.prototype = Object.create(Provider.prototype);

KML_Provider.prototype.constructor = KML_Provider;

KML_Provider.prototype.preprocessDataLayer = function preprocessDataLayer(layer) {
    layer.root = new THREE.Object3D();
    var featureLayer = new Layer();
    featureLayer.add(layer.root);
};

KML_Provider.prototype.tileInsideLimit = function tileInsideLimit() {
    return true;
};

KML_Provider.prototype.parseKML = function parseKML(urlFile) {
    return Fetcher.xml(urlFile).then((result) => {
        var geojson = Togeojson.kml(result);
        this.featureToolBox = new FeatureToolBox();
        var objLinesPolyToRaster = this.featureToolBox.extractFeatures(geojson); // Raster feat
        var geoFeat = this.featureToolBox.createFeaturesPoints(geojson);
        return { geoFeat, objLinesPolyToRaster };
    });
};


/**
 * Display in DOM the attributes of the clicked polygon
 * @param {type} p
 * @param {type} mouse
 * @returns {undefined}
 */
KML_Provider.prototype.showFeatureAttributesAtPos = function showFeatureAttributesAtPos(p, mouse) {
    var att = this.featureToolBox.showFeatureAttributesAtPos(p);
    var desc = att === '' ? 'No Description' : att;

    if (att !== 'noIntersect') {
        var canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        canvas.setAttribute('id', 'canvasID');
        var ctx = canvas.getContext('2d');

        ctx.textAlign = 'center';
        ctx.beginPath();
        ctx.globalAlpha = 0.50;
        ctx.font = '24px serif';
        var w = ctx.measureText(desc).width;
        var h = 30;
        ctx.rect(mouse.x - w / 2, mouse.y - h * 2 / 3, w, h);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.globalAlpha = 0.8;
        ctx.fillText(desc, mouse.x, mouse.y);

        canvas.style.left = '0px';// mouse.x + "px";
        canvas.style.top = '0px';// mouse.y + "px";
        canvas.style.position = 'absolute';

        document.body.appendChild(canvas);

        canvas.addEventListener('mousedown', () => {
            var oldcanv = document.getElementById('canvasID');
            oldcanv.parentNode.removeChild(oldcanv);
        }, false);
    }
};

KML_Provider.prototype.loadKMZCenterInBBox = function loadKMZCenterInBBox(/* bbox*/) {

};

/*
KML_Provider.prototype.loadKMZ = function(longitude, latitude) {

    return this.getUrlCollada(longitude, latitude).then(function(result) {

        if (result === undefined)
            { return undefined; }

        if (result.scene.children[0]) {
            var child = result.scene.children[0];
            var coorCarto = result.coorCarto;

            var position = this.ellipsoid.cartographicToCartesian(coorCarto);
            coorCarto.altitude = 0;
            var normal = this.ellipsoid.geodeticSurfaceNormalCartographic(coorCarto);

            var quaternion = new THREE.Quaternion();
            quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);

            child.lookAt(new THREE.Vector3().addVectors(position, normal));
            child.quaternion.multiply(quaternion);
            child.position.copy(position);

            child.updateMatrix();
            child.visible = false;

            var changeMaterial = function changeMaterial(object3D) {
                if (object3D.material instanceof THREE.MultiMaterial) {
                    object3D.material = new BasicMaterial(object3D.material.materials[0].color);
                } else if (object3D.material)
                    { object3D.material = new BasicMaterial(object3D.material.color); }
            };


            child.traverse(changeMaterial);

            return child;
        }
        return undefined;
    });
};
*/


/*
// Parse KML As a tree specific for geoportail
KML_Provider.prototype.parseKML = function(urlFile, longitude, latitude) {


    var north = latitude;
    var south = latitude;
    var east = longitude;
    var west = longitude;
    var key = 'va5orxd0pgzvq3jxutqfuy0b';
    var url = `http://wxs.ign.fr/${key}/vecteurtuile3d/BATI3D/FXX/`;
    return Fetcher.xml(urlFile).then((result) => {
        var NetworkLink = [];
        NetworkLink = result.getElementsByTagName('NetworkLink');

        for (var i = 0; i < NetworkLink.length; i++) {
            var coords = [];
            coords[0] = NetworkLink[i].getElementsByTagName('north')[0].childNodes[0].nodeValue;
            coords[1] = NetworkLink[i].getElementsByTagName('south')[0].childNodes[0].nodeValue;
            coords[2] = NetworkLink[i].getElementsByTagName('east')[0].childNodes[0].nodeValue;
            coords[3] = NetworkLink[i].getElementsByTagName('west')[0].childNodes[0].nodeValue;


            if (north < coords[0] && south > coords[1] && east < coords[2] && west > coords[3]) {
                var href = [];
                href[i] = `${url}TREE/${NetworkLink[i].getElementsByTagName('href')[0].childNodes[0].nodeValue.replace('../', '')}`;

                if (href[i].toLowerCase().substr(-4) === '.kml') {
                    return this.parseKML(href[i], longitude, latitude);
                }
                // Next level : Get the next KMZ actual position's coords
                else if (href[i].toLowerCase().substr(-4) === '.kmz') {
                    var url_kmz = url + NetworkLink[i].getElementsByTagName('href')[0].childNodes[0].nodeValue.replace('../../', '');
                    // url_kmz = "http://localhost:8383/kmz/BT_000092.kmz";

                    var p = this.cache[url_kmz];
                    if (!p) {
                        p = this.kmzLoader.load(url_kmz);
                        this.cache[url_kmz] = p;
                    }
                    return p;
                }
            }
        }
    });
};
*/

KML_Provider.prototype.getUrlCollada = function getUrlCollada(longitude, latitude) {
    return Fetcher.xml('http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/vecteurtuile3d/BATI3D/BU.Building.kml').then((/* result_0*/) => {
        // get href's node value
        // var kml_0 = result_0.getElementsByTagName("href");
        var url_href_1;
        var key = 'va5orxd0pgzvq3jxutqfuy0b';

        url_href_1 = `http://wxs.ign.fr/${key}/vecteurtuile3d/BATI3D/FXX/TREE/0/0_000_000.kml`;

        return this.parseKML(url_href_1, longitude, latitude);
    });
};


KML_Provider.prototype.executeCommand = function executeCommand(command) {
    const tile = command.requester;
    const layer = command.layer;
    const url = layer.url;
    const feature = this.cache[url];

    if (feature) {
        command.resolve(this.featureToolBox.createRasterImage(tile.bbox, feature));
    } else {
        this.parseKML(layer.url).then((obj) => {
            this.cache[url] = obj.objLinesPolyToRaster;
            command.resolve(this.featureToolBox.createRasterImage(tile.bbox, obj.objLinesPolyToRaster));
        });
    }
};

export default KML_Provider;
