/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

import IoDriver from 'Core/Commander/Providers/IoDriver';
import ItownsLine from 'Core/Commander/Providers/ItownsLine';
import THREE from 'THREE';
import Ellipsoid from 'Core/Math/Ellipsoid';
import CoordCarto from 'Core/Geographic/CoordCarto';

function IoDriver_JSON() {
    //Constructor
    IoDriver.call(this);

}

IoDriver_JSON.prototype = Object.create(IoDriver.prototype);

IoDriver_JSON.prototype.constructor = IoDriver_JSON;

IoDriver_JSON.prototype.read = function(url) {
    return fetch(url).then(function(response) {
        return response.json();
    });
};

IoDriver_JSON.prototype.parseGeoJSON = function(features) {

    var ellipsoid = new Ellipsoid(new THREE.Vector3(6378137, 6356752.3142451793, 6378137));
    var colorLine = new THREE.Color("rgb(255, 0, 0)");
    var line = new ItownsLine({
                                    time :  1.0,
                                    linewidth   : 100.0,
                                    texture :   "data/strokes/hway1.png",
                                    useTexture : false,
                                    opacity    : 1.0 ,
                                    sizeAttenuation : 1.0,
                                    color : [colorLine.r, colorLine.g, colorLine.b]
    });
    
    for (var r = 0; r < features.length; r++) {

        var hauteur = (features[r].properties.hauteur) || 0;
        var polygon = features[r].geometry.coordinates[0][0];
        
        if (polygon.length > 2) {
            for (var j = 0; j < polygon.length - 1; ++j) {
                var pt2DTab = polygon[j]; //.split(' ');
                var pt = new THREE.Vector3(parseFloat(pt2DTab[0]), hauteur, parseFloat(pt2DTab[1]));
                var coordCarto = new CoordCarto().setFromDegreeGeo(pt.x, pt.z, pt.y);
                line.addPoint(ellipsoid.cartographicToCartesian(coordCarto));
            }
   
        }
    }    
    return line;

};


export default IoDriver_JSON;
