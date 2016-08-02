/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

import IoDriver from 'Core/Commander/Providers/IoDriver';
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
    return fetch(url).then(response => {
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`Error loading ${url}: status ${response.status}`);
        }
        return response.json();
    });
};

IoDriver_JSON.prototype.parseGeoJSON = function(features) {

    var ellipsoid = new Ellipsoid(new THREE.Vector3(6378137, 6356752.3142451793, 6378137));
    var geometry =  new THREE.Geometry();
    
    for (var r = 0; r < features.length; r++) {

        var hauteur = (features[r].properties.hauteur + suppHeight) || 0;
        var polygon = features[r].geometry.coordinates[0][0];
        
        if (polygon.length > 2) {

            var arrPoint2D = [];
            // VERTICES
            for (var j = 0; j < polygon.length - 1; ++j) {

                var pt2DTab = polygon[j]; //.split(' ');
                var pt = new THREE.Vector3(parseFloat(pt2DTab[0]), 0, parseFloat(pt2DTab[1]));
                var coordCarto = new CoordCarto().setFromDegreeGeo(pt.x, pt.z, 0);
                geometry.vertices.push(ellipsoid.cartographicToCartesian(coordCarto));
            }
   
        }

    return geometry;

};


export default IoDriver_JSON;
