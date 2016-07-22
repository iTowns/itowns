/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/**
 * Generated On: 2015-10-5
 * Class: WMTS_Provider
 * Description: Fournisseur de données à travers un flux WMTS
 */



// TODO , will use WFS_Provider
import Provider from 'Core/Commander/Providers/Provider';
import WFS_Provider from 'Core/Commander/Providers/WFS_Provider';
import THREE from 'THREE';
import Ellipsoid from 'Core/Math/Ellipsoid';
import CoordCarto from 'Core/Geographic/CoordCarto';
import CVML from 'Core/Math/CVML';


function BuildingBox_Provider(options) {
    //Constructor

    // Provider.call( this,new IoDriver_XBIL());
    // this.cache         = CacheRessource();
    this.WFS_Provider = new WFS_Provider(options);
    this.geometry = null;
    this.geometryRoof = null;
    this.pivot = null;
    this.roadOn = true;
    this.rtcOn = true;

}

BuildingBox_Provider.prototype = Object.create(Provider.prototype);
BuildingBox_Provider.prototype.constructor = BuildingBox_Provider;


/**
 * Return url wmts MNT
 * @param {type} coWMTS : coord WMTS
 * @returns {Object@call;create.url.url|String}
 */
BuildingBox_Provider.prototype.url = function(longitude, latitude, radius) {

    //var key    = "wmybzw30d6zg563hjlq8eeqb";
    //var key    = coWMTS.zoom > 11 ? "va5orxd0pgzvq3jxutqfuy0b" : "wmybzw30d6zg563hjlq8eeqb"; // clef pro va5orxd0pgzvq3jxutqfuy0b

    var key = "72hpsel8j8nhb5qgdh07gcyp";

    //var layer  = "BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie"
    var serviceVersionRequestLayer = "service=WFS&version=2.0.0&REQUEST=GetFeature&typeName=BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie"

    var bottomLeft = new THREE.Vector2(longitude - radius, latitude - radius);
    var topRight = new THREE.Vector2(longitude + radius, latitude + radius);


    var url = "http://wxs.ign.fr/" + key + "/geoportail/wfs?" + serviceVersionRequestLayer +
        "&bbox=" + bottomLeft.x + "," + bottomLeft.y + "," + topRight.x +
        "," + topRight.y + ",epsg:4326&outputFormat=json";

    return url;
};

BuildingBox_Provider.prototype.getData = function(bbox, altitude) {
    return this.WFS_Provider.getData(bbox).then(function(data) {
        this.generateMesh(data, bbox, altitude); // console.log(data);
        return this.geometry;
    }.bind(this));
};

BuildingBox_Provider.prototype.generateMesh = function(elements, bbox, altitude) {

    //console.log(elements);

    var _geometry = new THREE.Geometry(); // for the walls
    var geometry = new THREE.Geometry(); // for the roof
    var suppHeight = 10; // So we don't cut the roof
    var ellipsoid = new Ellipsoid(new THREE.Vector3(6378137, 6356752.3142451793, 6378137));
    var features = elements.features;
    var altitude_ground = altitude - 1.5; //35;  // truck height
    //var cPano = new CoordCarto().setFromDegreeGeo(p1.x  ,p1.z, z_min );

    for (var r = 0; r < features.length; r++) {

        var hauteur = (features[r].properties.hauteur + suppHeight) || 0;
        var z_min = altitude_ground; //features[r].properties.z_min;  // altitude_ground // force altitude ground
        var polygon = features[r].geometry.coordinates[0][0];

        if (polygon.length > 2) {

            var arrPoint2D = [];
            // VERTICES
            for (var j = 0; j < polygon.length - 1; ++j) {

                var pt2DTab = polygon[j]; //.split(' ');
                var p1 = new THREE.Vector3(parseFloat(pt2DTab[0]), 0, parseFloat(pt2DTab[1]));

                var coordCarto1 = new CoordCarto().setFromDegreeGeo(p1.x, p1.z, z_min);
                var coordCarto2 = new CoordCarto().setFromDegreeGeo(p1.x, p1.z, z_min + hauteur); // + Math.random(1000) );
                var pgeo1 = ellipsoid.cartographicToCartesian(coordCarto1); //{longitude:p1.z, latitude:p1.x, altitude: 0});
                var pgeo2 = ellipsoid.cartographicToCartesian(coordCarto2);

                var vector3_1 = new THREE.Vector3(pgeo1.x, pgeo1.y, pgeo1.z); // - x temporary, bug
                var vector3_2 = new THREE.Vector3(pgeo2.x, pgeo2.y, pgeo2.z);

                arrPoint2D.push(CVML.newPoint(p1.z, p1.x)); //-pgeo1.x, pgeo1.z)); //for roof
                _geometry.vertices.push(vector3_1, vector3_2);

            }

            // FACES
            // indice of the first point of the polygon 3D
            for (var k = _geometry.vertices.length - ((polygon.length - 1) * 2); k < _geometry.vertices.length; k = k + 2) {

                var l = k; // % (pts2DTab.length);
                if (l > _geometry.vertices.length - 4) {
                    l = _geometry.vertices.length - ((polygon.length - 1) * 2);
                }
                _geometry.faces.push(new THREE.Face3(l, l + 1, l + 3));
                _geometry.faces.push(new THREE.Face3(l, l + 3, l + 2));
            }

            var ll = _geometry.vertices.length - ((polygon.length - 1) * 2);
            _geometry.faces.push(new THREE.Face3(ll, ll + 1, _geometry.vertices.length - 1));
            _geometry.faces.push(new THREE.Face3(ll, _geometry.vertices.length - 1, _geometry.vertices.length - 2));

        }

        //**************** ROOF ****************************

        var triangles = CVML.TriangulatePoly(arrPoint2D);
        //var geometry = new THREE.Geometry();  // for the roof
        triangles.forEach(function(t) {

            var pt1 = t.getPoint(0),
                pt2 = t.getPoint(1),
                pt3 = t.getPoint(2);

            var coordCarto1 = new CoordCarto().setFromDegreeGeo(pt1.y, pt1.x, z_min + hauteur);
            var coordCarto2 = new CoordCarto().setFromDegreeGeo(pt2.y, pt2.x, z_min + hauteur); // + Math.random(1000) );
            var coordCarto3 = new CoordCarto().setFromDegreeGeo(pt3.y, pt3.x, z_min + hauteur);

            var pgeo1 = ellipsoid.cartographicToCartesian(coordCarto1); //{longitude:p1.z, latitude:p1.x, altitude: 0});
            var pgeo2 = ellipsoid.cartographicToCartesian(coordCarto2);
            var pgeo3 = ellipsoid.cartographicToCartesian(coordCarto3);

            //var geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3(pgeo1.x, pgeo1.y, pgeo1.z));
            geometry.vertices.push(new THREE.Vector3(pgeo2.x, pgeo2.y, pgeo2.z));
            geometry.vertices.push(new THREE.Vector3(pgeo3.x, pgeo3.y, pgeo3.z));

            var face = new THREE.Face3(
                geometry.vertices.length - 3,
                geometry.vertices.length - 2,
                geometry.vertices.length - 1
            );
            geometry.faces.push(face);

        });

    }

    if (this.roadOn)
        this.addRoad(_geometry, bbox, altitude_ground, ellipsoid);


    _geometry.computeFaceNormals(); // WARNING : VERY IMPORTANT WHILE WORKING WITH RAY CASTING ON CUSTOM MESH
    geometry.computeFaceNormals();

    /*
        var matLambert = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.8});
        var _currentMeshForRoof  = new THREE.Mesh(_geometry, matLambert);// //geometryClickToGo,mat);
        gfxEngine().add3DScene(_currentMeshForRoof);
    */

    // Test if we return brute geometry or if we use local pivot (for RTC)
    var firstPos = new THREE.Vector3();
    if (this.rtcOn) {
        firstPos = _geometry.vertices[0].clone();
        // create pivot from 1st pos vertex
        for (var i = 0; i < _geometry.vertices.length; ++i) {
            _geometry.vertices[i].sub(firstPos);
        }
        for (i = 0; i < geometry.vertices.length; ++i) {
            geometry.vertices[i].sub(firstPos);
        }
    }

    this.geometry = _geometry;
    this.pivot = firstPos;
    this.geometryRoof = geometry;

    return {
        geometry: _geometry,
        pivot: firstPos,
        geometryRoof: geometry
    };

};


BuildingBox_Provider.prototype.addRoad = function(geometry, bbox, altitude_road, ellipsoid) {

    // Version using SIMPLE PLANE ROAD for Click and Go
    var ratio = 0.2;
    var roadWidth = (bbox.maxCarto.longitude - bbox.minCarto.longitude) * ratio;
    var roadHeight = (bbox.maxCarto.latitude - bbox.minCarto.latitude) * ratio;
    var pos = new THREE.Vector3((bbox.minCarto.latitude + bbox.maxCarto.latitude) / 2,
        altitude_road, (bbox.minCarto.longitude + bbox.maxCarto.longitude) / 2); //48.8505774,  altitude_sol, 2.3348124);

    var coordCarto1 = new CoordCarto().setFromDegreeGeo(pos.x - roadWidth, pos.z - roadHeight, altitude_road);
    var coordCarto2 = new CoordCarto().setFromDegreeGeo(pos.x - roadWidth, pos.z + roadHeight, altitude_road);
    var coordCarto3 = new CoordCarto().setFromDegreeGeo(pos.x + roadWidth, pos.z + roadHeight, altitude_road);
    var coordCarto4 = new CoordCarto().setFromDegreeGeo(pos.x + roadWidth, pos.z - roadHeight, altitude_road);

    var pgeo1 = ellipsoid.cartographicToCartesian(coordCarto1);
    var pgeo2 = ellipsoid.cartographicToCartesian(coordCarto2);
    var pgeo3 = ellipsoid.cartographicToCartesian(coordCarto3);
    var pgeo4 = ellipsoid.cartographicToCartesian(coordCarto4);

    geometry.vertices.push(new THREE.Vector3(pgeo1.x, pgeo1.y, pgeo1.z));
    geometry.vertices.push(new THREE.Vector3(pgeo2.x, pgeo2.y, pgeo2.z));
    geometry.vertices.push(new THREE.Vector3(pgeo3.x, pgeo3.y, pgeo3.z));
    geometry.vertices.push(new THREE.Vector3(pgeo4.x, pgeo4.y, pgeo4.z));

    var len = geometry.vertices.length;
    geometry.faces.push(new THREE.Face3(len - 4, len - 3, len - 2));
    geometry.faces.push(new THREE.Face3(len - 4, len - 2, len - 1));
};



export default BuildingBox_Provider;
