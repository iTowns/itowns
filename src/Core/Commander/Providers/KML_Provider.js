/**
 * Generated On: 2016-01-20
 * Class: KML_Provider
 * Description: Parseur de KML jusqu'à obtention du collada
 */
/* global Promise*/

import Provider from 'Core/Commander/Providers/Provider';
import IoDriverXML from 'Core/Commander/Providers/IoDriverXML';
import THREE from 'THREE';
import KMZLoader from 'Renderer/ThreeExtented/KMZLoader';
import BasicMaterial from 'Renderer/BasicMaterial';


function KML_Provider(ellipsoid) {
    //Constructor
    this.ellipsoid = ellipsoid;
    this.ioDriverXML = new IoDriverXML();
    this.kmzLoader = new KMZLoader();
    this.cache = new Map();
}

KML_Provider.prototype = Object.create(Provider.prototype);

KML_Provider.prototype.constructor = KML_Provider;

KML_Provider.prototype.loadKMZCenterInBBox = function( /*bbox*/ ) {

};

KML_Provider.prototype.loadKMZ = function(longitude, latitude) {

    return this.getUrlCollada(longitude, latitude).then(function(result) {

        if (result === undefined)
            return undefined;

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

            var changeMaterial = function(object3D) {

                if (object3D.material instanceof THREE.MultiMaterial) {
                    object3D.material = new BasicMaterial(object3D.material.materials[0].color);
                } else if (object3D.material)
                    object3D.material = new BasicMaterial(object3D.material.color);
            };


            child.traverse(changeMaterial);

            return child;
        }
        return undefined;

    }.bind(this));

};

KML_Provider.prototype.parseKML = function(urlFile, longitude, latitude) {

    /*var longitude = 48.87;
    var south = 48.875;
    var east = -3.4900000000000046;
    var west = -3.4940000000000044;*/
    var north = latitude;
    var south = latitude;
    var east = longitude;
    var west = longitude;
    var key = 'va5orxd0pgzvq3jxutqfuy0b';
    var url = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'FXX/';
    return this.ioDriverXML.read(urlFile).then(function(result) {

        var NetworkLink = [];
        NetworkLink = result.getElementsByTagName("NetworkLink");

        for (var i = 0; i < NetworkLink.length; i++) {

            var coords = [];
            coords[0] = NetworkLink[i].getElementsByTagName("north")[0].childNodes[0].nodeValue;
            coords[1] = NetworkLink[i].getElementsByTagName("south")[0].childNodes[0].nodeValue;
            coords[2] = NetworkLink[i].getElementsByTagName("east")[0].childNodes[0].nodeValue;
            coords[3] = NetworkLink[i].getElementsByTagName("west")[0].childNodes[0].nodeValue;


            if (north < coords[0] && south > coords[1] && east < coords[2] && west > coords[3]) {

                var href = [];
                href[i] = url + "TREE/" + NetworkLink[i].getElementsByTagName("href")[0].childNodes[0].nodeValue.replace("../", "");

                if (href[i].toLowerCase().substr(-4) === '.kml') {

                    return this.parseKML(href[i], longitude, latitude);

                }
                //Next level : Get the next KMZ actual position's coords
                else if (href[i].toLowerCase().substr(-4) === '.kmz') {

                    var url_kmz = url + NetworkLink[i].getElementsByTagName("href")[0].childNodes[0].nodeValue.replace("../../", "");
                    //url_kmz = "http://localhost:8383/kmz/BT_000092.kmz";

                    var p = this.cache[url_kmz];
                    if (!p) {
                        p = this.kmzLoader.load(url_kmz);
                        this.cache[url_kmz] = p;
                    }
                    return p;
                }
            }
        }

    }.bind(this));

};


KML_Provider.prototype.getUrlCollada = function(longitude, latitude) {

    return this.ioDriverXML.read('http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/vecteurtuile3d/BATI3D/BU.Building.kml').then(function( /*result_0*/ ) {

        // get href's node value
        //var kml_0 = result_0.getElementsByTagName("href");
        var url_href_1;
        var key = 'va5orxd0pgzvq3jxutqfuy0b';

        url_href_1 = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/FXX/TREE/0/0_000_000.kml';

        return this.parseKML(url_href_1, longitude, latitude);

    }.bind(this));
};

export default KML_Provider;
//If France
//                if (url_href_1[i] === 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/FXX/TREE/0/0_000_000.kml'){
//                    //this.ParseKML(url_href_1[i]);
//                    //console.log("wesh");
//                    this.ioDriverXML.read(url_href_1[i]).then(function(result_1)
//                    {
//                        var kml_1 = [];
//                        kml_1 = result_1.getElementsByTagName("href");
//                        //console.log(kml_1.length);
//
//                        for (j=0; j<kml_1.length; j++){
//
//                            var url_href_2 = [];
//                            url_href_2[j] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'FXX' + "/TREE/" + kml_1[j].childNodes[0].nodeValue.replace("../", "");
//                            //console.log(url_href_2[j]);
//
//                            //get tile's coords
//                            var coords_2 = [];
//                            coords_2[j,1] = result_1.getElementsByTagName("north")[j].childNodes[0].nodeValue;
//                            coords_2[j,2] = result_1.getElementsByTagName("south")[j].childNodes[0].nodeValue;
//                            coords_2[j,3] = result_1.getElementsByTagName("east")[j].childNodes[0].nodeValue;
//                            coords_2[j,4] = result_1.getElementsByTagName("west")[j].childNodes[0].nodeValue;
//
//                            //get min and max LodPixel of each tile
//                            /*var min_max_2 = [];
//                            min_max_2[j,1] = result_1.getElementsByTagName("minLodPixels")[j].childNodes[0].nodeValue;
//                            min_max_2[j,2] = result_1.getElementsByTagName("maxLodPixels")[j].childNodes[0].nodeValue;
//                            console.log("minLodPixels = " + min_max_2[j,1] + "; maxLodPixels = " + min_max_2[j,2]);*/
//
//                            //Next level : Get the next KML actual position's coords
//                            //this.ParseKML(url_href_2[j]/*, coords_2[j,1], coords_2[j,2], coords_2[j,3], coords_2[j,4]*/);
//                            if (north < coords_2[j,1] && south > coords_2[j,2]  && east < coords_2[j,3] && west > coords_2[j,4]){
//                                //this.ParseKML(url_href_2[j]);
//
//                                this.ioDriverXML.read(url_href_2[j]).then(function(result_2){
//
//                                    var kml_2 = [];
//                                    kml_2 = result_2.getElementsByTagName("href");
//
//                                    for (k=0; k<kml_2.length; k++){
//                                        var url_href_3 = [];
//                                        url_href_3[k] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'FXX' + "/TREE/" + kml_2[k].childNodes[0].nodeValue.replace("../", "");
//                                        //console.log(url_href_3[k]);
//
//                                        var coords_3 = [];
//                                        coords_3[k,1] = result_1.getElementsByTagName("north")[k].childNodes[0].nodeValue;
//                                        coords_3[k,2] = result_1.getElementsByTagName("south")[k].childNodes[0].nodeValue;
//                                        coords_3[k,3] = result_1.getElementsByTagName("east")[k].childNodes[0].nodeValue;
//                                        coords_3[k,4] = result_1.getElementsByTagName("west")[k].childNodes[0].nodeValue;
//
//                                        //Next Level : Get the next KML actual position's coords
//                                        if (north < coords_3[k,1] && south > coords_3[k,2]  && east < coords_3[k,3] && west > coords_3[k,4]){
//
//                                            this.ioDriverXML.read(url_href_3[k]).then(function(result_3){
//
//                                                var kml_3 = [];
//                                                kml_3 = result_3.getElementsByTagName("href");
//
//                                                for (l=0; l<kml_3.length; l++){
//                                                    var url_href_4 = [];
//                                                    url_href_4[l] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'FXX' + "/TREE/" + kml_3[l].childNodes[0].nodeValue.replace("../", "");
//                                                    //console.log(url_href_4[l]);
//
//                                                    var coords_4 = [];
//                                                    coords_4[l,1] = result_1.getElementsByTagName("north")[l].childNodes[0].nodeValue;
//                                                    coords_4[l,2] = result_1.getElementsByTagName("south")[l].childNodes[0].nodeValue;
//                                                    coords_4[l,3] = result_1.getElementsByTagName("east")[l].childNodes[0].nodeValue;
//                                                    coords_4[l,4] = result_1.getElementsByTagName("west")[l].childNodes[0].nodeValue;
//
//                                                    //Next Level : Get the KMZ actual position's coords
//                                                    if (north < coords_4[l,1] && south > coords_4[l,2]  && east < coords_4[l,3] && west > coords_4[l,4]){
//
//                                                        this.ioDriverXML.read(url_href_4[l]).then(function(result_4){
//
//                                                            var kml_4 = [];
//                                                            kml_4 = result_4.getElementsByTagName("href");
//
//                                                            //Get KMZ
//                                                            for (m=0; m<kml_4.length; m++){
//                                                                var url_href_kmz = [];
//                                                                url_href_kmz[m] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'FXX/' + kml_4[m].childNodes[0].nodeValue.replace("../../", "");
//                                                                //console.log(url_href_kmz[m]);
//
//                                                                /*this.ioDriverXML = new IoDriverXML();
//                                                                var KMZLoader = new THREE.KMZLoader();
//                                                                this.ioDriverXML.read(KMZLoader.load(url_href_kmz[m])).then(function(result_5){
//                                                                    console.log(result_5);
//                                                                });*/
//
//                                                                //var col =  KMZLoader.parse("file/" + KMZLoader.load(url_href_kmz[m]));
//                                                                var kmz = [];
//                                                                return this.KMZLoader.load(url_href_kmz[m]).then(function(result){
//
//                                                                        deferred.resolve(result);
//                                                                        //return result;
//                                                                }.bind(this));
//
//                                                                //var kmz += "file/" + kmz;
//
//                                                                //var kmz_2 = KMZLoader.parse(url_href_kmz[m]);
//                                                                //console.log(kmz_2);
//
//                                                                //return kmz[m];
//                                                            }
//                                                            //console.log(url_href_kmz.length);
//                                                        }.bind(this));
//                                                    }
//
//                                                }
//
//                                            }.bind(this));
//                                        }
//                                    }
//
//                                }.bind(this));
//                            }
//
//                        }
//
//                    }.bind(this));
//
//                }
//            }
//
//        }.bind(this));
//
//        return deferred;
//    };
//
//    return KML_Provider;
//
//});

/*
 //If Guadeloupe
                if (url_href_1[i] === 'http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/vecteurtuile3d/BATI3D/GLP/TREE/0/0_00_00.kml'){

                    this.ioDriverXML = new IoDriverXML();
                    this.ioDriverXML.read(url_href_1[i]).then(function(result_1)
                    {

                        var kml_1 = [];
                        kml_1 = result_1.getElementsByTagName("href");
                        //console.log(kml_1.length);

                        for (j=0; j<kml_1.length; j++){

                            var url_href_2 = [];
                            url_href_2[j] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'GLP' + "/TREE/" + kml_1[j].childNodes[0].nodeValue.replace("../", "");
                            //console.log(url_href_2[j]);

                            //get tile's coords
                            var coords_2 = [];
                            coords_2[j,1] = result_1.getElementsByTagName("north")[j].childNodes[0].nodeValue;
                            coords_2[j,2] = result_1.getElementsByTagName("south")[j].childNodes[0].nodeValue;
                            coords_2[j,3] = result_1.getElementsByTagName("east")[j].childNodes[0].nodeValue;
                            coords_2[j,4] = result_1.getElementsByTagName("west")[j].childNodes[0].nodeValue;
                            //console.log(coords_2[j,1] + coords_2[j,2] + coords_2[j,3] + coords_2[j,4]);

                            //get min and max LodPixel of each tile
                            //var min_max_2 = [];
                            //min_max_2[j,1] = result_1.getElementsByTagName("minLodPixels")[j].childNodes[0].nodeValue;
                            //min_max_2[j,2] = result_1.getElementsByTagName("maxLodPixels")[j].childNodes[0].nodeValue;
                            //console.log("minLodPixels = " + min_max_2[j,1] + "; maxLodPixels = " + min_max_2[j,2]);

                            //Next level : Get the next KML actual position's coords
                            if (north < coords_2[j,1] && south > coords_2[j,2]  && east < coords_2[j,3] && west > coords_2[j,4]){
                                this.ioDriverXML = new IoDriverXML();
                                this.ioDriverXML.read(url_href_2[j]).then(function(result_2){

                                    var kml_2 = [];
                                    kml_2 = result_2.getElementsByTagName("href");

                                    for (k=0; k<kml_2.length; k++){
                                        var url_href_3 = [];
                                        url_href_3[k] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'GLP' + "/TREE/" + kml_2[k].childNodes[0].nodeValue.replace("../", "");
                                        //console.log(url_href_3[k]);

                                        var coords_3 = [];
                                        coords_3[k,1] = result_1.getElementsByTagName("north")[k].childNodes[0].nodeValue;
                                        coords_3[k,2] = result_1.getElementsByTagName("south")[k].childNodes[0].nodeValue;
                                        coords_3[k,3] = result_1.getElementsByTagName("east")[k].childNodes[0].nodeValue;
                                        coords_3[k,4] = result_1.getElementsByTagName("west")[k].childNodes[0].nodeValue;

                                        //Next Level : Get the next KML actual position's coords
                                        if (north < coords_3[k,1] && south > coords_3[k,2]  && east < coords_3[k,3] && west > coords_3[k,4]){
                                            this.ioDriverXML_3 = new IoDriverXML();
                                            this.ioDriverXML_3.read(url_href_3[k]).then(function(result_3){

                                                var kml_3 = [];
                                                kml_3 = result_3.getElementsByTagName("href");

                                                for (l=0; l<kml_3.length; l++){
                                                    var url_href_4 = [];
                                                    url_href_4[l] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'GLP' + "/" + kml_3[l].childNodes[0].nodeValue.replace("../../", "");
                                                    console.log(url_href_4[l]);

                                                    var coords_4 = [];
                                                    coords_4[l,1] = result_1.getElementsByTagName("north")[l].childNodes[0].nodeValue;
                                                    coords_4[l,2] = result_1.getElementsByTagName("south")[l].childNodes[0].nodeValue;
                                                    coords_4[l,3] = result_1.getElementsByTagName("east")[l].childNodes[0].nodeValue;
                                                    coords_4[l,4] = result_1.getElementsByTagName("west")[l].childNodes[0].nodeValue;

                                                }

                                            });
                                        }
                                    }

                                });
                            }

                        }

                    });

                }

                //If Guyane
                if (url_href_1[i] === 'http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/vecteurtuile3d/BATI3D/GUF/TREE/0/0_00_00.kml'){

                    this.ioDriverXML = new IoDriverXML();
                    this.ioDriverXML.read(url_href_1[i]).then(function(result_1)
                    {

                        var kml_1 = [];
                        kml_1 = result_1.getElementsByTagName("href");
                        //console.log(kml_1.length);

                        for (j=0; j<kml_1.length; j++){

                            var url_href_2 = [];
                            url_href_2[j] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'GUF' + "/TREE/" + kml_1[j].childNodes[0].nodeValue.replace("../", "");
                            //console.log(url_href_2[j]);

                            //get tile's coords
                            var coords_2 = [];
                            coords_2[j,1] = result_1.getElementsByTagName("north")[j].childNodes[0].nodeValue;
                            coords_2[j,2] = result_1.getElementsByTagName("south")[j].childNodes[0].nodeValue;
                            coords_2[j,3] = result_1.getElementsByTagName("east")[j].childNodes[0].nodeValue;
                            coords_2[j,4] = result_1.getElementsByTagName("west")[j].childNodes[0].nodeValue;
                            //console.log(coords_2[j,1] + coords_2[j,2] + coords_2[j,3] + coords_2[j,4]);

                            //get min and max LodPixel of each tile
                            //var min_max_2 = [];
                            //min_max_2[j,1] = result_1.getElementsByTagName("minLodPixels")[j].childNodes[0].nodeValue;
                            //min_max_2[j,2] = result_1.getElementsByTagName("maxLodPixels")[j].childNodes[0].nodeValue;
                            //console.log("minLodPixels = " + min_max_2[j,1] + "; maxLodPixels = " + min_max_2[j,2]);

                            //Next level : Get the next KML actual position's coords
                            if (north < coords_2[j,1] && south > coords_2[j,2]  && east < coords_2[j,3] && west > coords_2[j,4]){
                                this.ioDriverXML = new IoDriverXML();
                                this.ioDriverXML.read(url_href_2[j]).then(function(result_2){

                                    var kml_2 = [];
                                    kml_2 = result_2.getElementsByTagName("href");

                                    for (k=0; k<kml_2.length; k++){
                                        var url_href_3 = [];
                                        url_href_3[k] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'GUF' + "/TREE/" + kml_2[k].childNodes[0].nodeValue.replace("../", "");
                                        //console.log(url_href_3[k]);

                                        var coords_3 = [];
                                        coords_3[k,1] = result_1.getElementsByTagName("north")[k].childNodes[0].nodeValue;
                                        coords_3[k,2] = result_1.getElementsByTagName("south")[k].childNodes[0].nodeValue;
                                        coords_3[k,3] = result_1.getElementsByTagName("east")[k].childNodes[0].nodeValue;
                                        coords_3[k,4] = result_1.getElementsByTagName("west")[k].childNodes[0].nodeValue;

                                        //Next Level : Get the next KML actual position's coords
                                        if (north < coords_3[k,1] && south > coords_3[k,2]  && east < coords_3[k,3] && west > coords_3[k,4]){
                                            this.ioDriverXML_3 = new IoDriverXML();
                                            this.ioDriverXML_3.read(url_href_3[k]).then(function(result_3){

                                                var kml_3 = [];
                                                kml_3 = result_3.getElementsByTagName("href");

                                                for (l=0; l<kml_3.length; l++){
                                                    var url_href_4 = [];
                                                    url_href_4[l] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'GUF' + "/" + kml_3[l].childNodes[0].nodeValue.replace("../../", "");
                                                    //console.log(url_href_4[l]);

                                                    var coords_4 = [];
                                                    coords_4[l,1] = result_1.getElementsByTagName("north")[l].childNodes[0].nodeValue;
                                                    coords_4[l,2] = result_1.getElementsByTagName("south")[l].childNodes[0].nodeValue;
                                                    coords_4[l,3] = result_1.getElementsByTagName("east")[l].childNodes[0].nodeValue;
                                                    coords_4[l,4] = result_1.getElementsByTagName("west")[l].childNodes[0].nodeValue;

                                                }

                                            });
                                        }
                                    }

                                });
                            }

                        }

                    });

                }

                //If Martinique
                if (url_href_1[i] === 'http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/vecteurtuile3d/BATI3D/MTQ/TREE/0/0_00_00.kml'){

                    this.ioDriverXML = new IoDriverXML();
                    this.ioDriverXML.read(url_href_1[i]).then(function(result_1)
                    {

                        var kml_1 = [];
                        kml_1 = result_1.getElementsByTagName("href");
                        //console.log(kml_1.length);

                        for (j=0; j<kml_1.length; j++){

                            var url_href_2 = [];
                            url_href_2[j] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'MTQ' + "/TREE/" + kml_1[j].childNodes[0].nodeValue.replace("../", "");
                            //console.log(url_href_2[j]);

                            //get tile's coords
                            var coords_2 = [];
                            coords_2[j,1] = result_1.getElementsByTagName("north")[j].childNodes[0].nodeValue;
                            coords_2[j,2] = result_1.getElementsByTagName("south")[j].childNodes[0].nodeValue;
                            coords_2[j,3] = result_1.getElementsByTagName("east")[j].childNodes[0].nodeValue;
                            coords_2[j,4] = result_1.getElementsByTagName("west")[j].childNodes[0].nodeValue;
                            //console.log(coords_2[j,1] + coords_2[j,2] + coords_2[j,3] + coords_2[j,4]);

                            //get min and max LodPixel of each tile
                            //var min_max_2 = [];
                            //min_max_2[j,1] = result_1.getElementsByTagName("minLodPixels")[j].childNodes[0].nodeValue;
                            //min_max_2[j,2] = result_1.getElementsByTagName("maxLodPixels")[j].childNodes[0].nodeValue;
                            //console.log("minLodPixels = " + min_max_2[j,1] + "; maxLodPixels = " + min_max_2[j,2]);

                            //Next level : Get the next KML actual position's coords
                            if (north < coords_2[j,1] && south > coords_2[j,2]  && east < coords_2[j,3] && west > coords_2[j,4]){
                                this.ioDriverXML = new IoDriverXML();
                                this.ioDriverXML.read(url_href_2[j]).then(function(result_2){

                                    var kml_2 = [];
                                    kml_2 = result_2.getElementsByTagName("href");

                                    for (k=0; k<kml_2.length; k++){
                                        var url_href_3 = [];
                                        url_href_3[k] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'MTQ' + "/TREE/" + kml_2[k].childNodes[0].nodeValue.replace("../", "");
                                        //console.log(url_href_3[k]);

                                        var coords_3 = [];
                                        coords_3[k,1] = result_1.getElementsByTagName("north")[k].childNodes[0].nodeValue;
                                        coords_3[k,2] = result_1.getElementsByTagName("south")[k].childNodes[0].nodeValue;
                                        coords_3[k,3] = result_1.getElementsByTagName("east")[k].childNodes[0].nodeValue;
                                        coords_3[k,4] = result_1.getElementsByTagName("west")[k].childNodes[0].nodeValue;

                                        //Next Level : Get the next KML actual position's coords
                                        if (north < coords_3[k,1] && south > coords_3[k,2]  && east < coords_3[k,3] && west > coords_3[k,4]){
                                            this.ioDriverXML_3 = new IoDriverXML();
                                            this.ioDriverXML_3.read(url_href_3[k]).then(function(result_3){

                                                var kml_3 = [];
                                                kml_3 = result_3.getElementsByTagName("href");

                                                for (l=0; l<kml_3.length; l++){
                                                    var url_href_4 = [];
                                                    url_href_4[l] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'MTQ' + "/" + kml_3[l].childNodes[0].nodeValue.replace("../../", "");
                                                    //console.log(url_href_4[l]);

                                                    var coords_4 = [];
                                                    coords_4[l,1] = result_1.getElementsByTagName("north")[l].childNodes[0].nodeValue;
                                                    coords_4[l,2] = result_1.getElementsByTagName("south")[l].childNodes[0].nodeValue;
                                                    coords_4[l,3] = result_1.getElementsByTagName("east")[l].childNodes[0].nodeValue;
                                                    coords_4[l,4] = result_1.getElementsByTagName("west")[l].childNodes[0].nodeValue;

                                                }

                                            });
                                        }
                                    }

                                });
                            }

                        }

                    });

                }

                //If Réunion
                if (url_href_1[i] === 'http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/vecteurtuile3d/BATI3D/REU/TREE/0/0_00_00.kml'){

                    this.ioDriverXML = new IoDriverXML();
                    this.ioDriverXML.read(url_href_1[i]).then(function(result_1)
                    {

                        var kml_1 = [];
                        kml_1 = result_1.getElementsByTagName("href");
                        //console.log(kml_1.length);

                        for (j=0; j<kml_1.length; j++){

                            var url_href_2 = [];
                            url_href_2[j] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'REU' + "/TREE/" + kml_1[j].childNodes[0].nodeValue.replace("../", "");
                            //console.log(url_href_2[j]);

                            //get tile's coords
                            var coords_2 = [];
                            coords_2[j,1] = result_1.getElementsByTagName("north")[j].childNodes[0].nodeValue;
                            coords_2[j,2] = result_1.getElementsByTagName("south")[j].childNodes[0].nodeValue;
                            coords_2[j,3] = result_1.getElementsByTagName("east")[j].childNodes[0].nodeValue;
                            coords_2[j,4] = result_1.getElementsByTagName("west")[j].childNodes[0].nodeValue;
                            //console.log(coords_2[j,1] + coords_2[j,2] + coords_2[j,3] + coords_2[j,4]);

                            //get min and max LodPixel of each tile
                            //var min_max_2 = [];
                            //min_max_2[j,1] = result_1.getElementsByTagName("minLodPixels")[j].childNodes[0].nodeValue;
                            //min_max_2[j,2] = result_1.getElementsByTagName("maxLodPixels")[j].childNodes[0].nodeValue;
                            //console.log("minLodPixels = " + min_max_2[j,1] + "; maxLodPixels = " + min_max_2[j,2]);

                            //Next level : Get the next KML actual position's coords
                            if (north < coords_2[j,1] && south > coords_2[j,2]  && east < coords_2[j,3] && west > coords_2[j,4]){
                                this.ioDriverXML = new IoDriverXML();
                                this.ioDriverXML.read(url_href_2[j]).then(function(result_2){

                                    var kml_2 = [];
                                    kml_2 = result_2.getElementsByTagName("href");

                                    for (k=0; k<kml_2.length; k++){
                                        var url_href_3 = [];
                                        url_href_3[k] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'REU' + "/TREE/" + kml_2[k].childNodes[0].nodeValue.replace("../", "");
                                        //console.log(url_href_3[k]);

                                        var coords_3 = [];
                                        coords_3[k,1] = result_1.getElementsByTagName("north")[k].childNodes[0].nodeValue;
                                        coords_3[k,2] = result_1.getElementsByTagName("south")[k].childNodes[0].nodeValue;
                                        coords_3[k,3] = result_1.getElementsByTagName("east")[k].childNodes[0].nodeValue;
                                        coords_3[k,4] = result_1.getElementsByTagName("west")[k].childNodes[0].nodeValue;

                                        //Next Level : Get the next KML actual position's coords
                                        if (north < coords_3[k,1] && south > coords_3[k,2]  && east < coords_3[k,3] && west > coords_3[k,4]){
                                            this.ioDriverXML_3 = new IoDriverXML();
                                            this.ioDriverXML_3.read(url_href_3[k]).then(function(result_3){

                                                var kml_3 = [];
                                                kml_3 = result_3.getElementsByTagName("href");

                                                for (l=0; l<kml_3.length; l++){
                                                    var url_href_4 = [];
                                                    url_href_4[l] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'REU' + "/" + kml_3[l].childNodes[0].nodeValue.replace("../../", "");
                                                    //console.log(url_href_4[l]);

                                                    var coords_4 = [];
                                                    coords_4[l,1] = result_1.getElementsByTagName("north")[l].childNodes[0].nodeValue;
                                                    coords_4[l,2] = result_1.getElementsByTagName("south")[l].childNodes[0].nodeValue;
                                                    coords_4[l,3] = result_1.getElementsByTagName("east")[l].childNodes[0].nodeValue;
                                                    coords_4[l,4] = result_1.getElementsByTagName("west")[l].childNodes[0].nodeValue;

                                                }

                                            });
                                        }
                                    }

                                });
                            }

                        }

                    });

                }
                //If Saint-Pierre et Miquelon
                if (url_href_1[i] === 'http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/vecteurtuile3d/BATI3D/SPM/TREE/0/0_00_00.kml'){

                    this.ioDriverXML = new IoDriverXML();
                    this.ioDriverXML.read(url_href_1[i]).then(function(result_1)
                    {

                        var kml_1 = [];
                        kml_1 = result_1.getElementsByTagName("href");
                        //console.log(kml_1.length);

                        for (j=0; j<kml_1.length; j++){

                            var url_href_2 = [];
                            url_href_2[j] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'SPM' + "/TREE/" + kml_1[j].childNodes[0].nodeValue.replace("../", "");
                            //console.log(url_href_2[j]);

                            //get tile's coords
                            var coords_2 = [];
                            coords_2[j,1] = result_1.getElementsByTagName("north")[j].childNodes[0].nodeValue;
                            coords_2[j,2] = result_1.getElementsByTagName("south")[j].childNodes[0].nodeValue;
                            coords_2[j,3] = result_1.getElementsByTagName("east")[j].childNodes[0].nodeValue;
                            coords_2[j,4] = result_1.getElementsByTagName("west")[j].childNodes[0].nodeValue;
                            //console.log(coords_2[j,1] + coords_2[j,2] + coords_2[j,3] + coords_2[j,4]);

                            //get min and max LodPixel of each tile
                            //var min_max_2 = [];
                            //min_max_2[j,1] = result_1.getElementsByTagName("minLodPixels")[j].childNodes[0].nodeValue;
                            //min_max_2[j,2] = result_1.getElementsByTagName("maxLodPixels")[j].childNodes[0].nodeValue;
                            //console.log("minLodPixels = " + min_max_2[j,1] + "; maxLodPixels = " + min_max_2[j,2]);

                            //Next level : Get the next KML actual position's coords
                            if (north < coords_2[j,1] && south > coords_2[j,2]  && east < coords_2[j,3] && west > coords_2[j,4]){
                                this.ioDriverXML = new IoDriverXML();
                                this.ioDriverXML.read(url_href_2[j]).then(function(result_2){

                                    var kml_2 = [];
                                    kml_2 = result_2.getElementsByTagName("href");

                                    for (k=0; k<kml_2.length; k++){
                                        var url_href_3 = [];
                                        url_href_3[k] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'SPM' + "/TREE/" + kml_2[k].childNodes[0].nodeValue.replace("../", "");
                                        //console.log(url_href_3[k]);

                                        var coords_3 = [];
                                        coords_3[k,1] = result_1.getElementsByTagName("north")[k].childNodes[0].nodeValue;
                                        coords_3[k,2] = result_1.getElementsByTagName("south")[k].childNodes[0].nodeValue;
                                        coords_3[k,3] = result_1.getElementsByTagName("east")[k].childNodes[0].nodeValue;
                                        coords_3[k,4] = result_1.getElementsByTagName("west")[k].childNodes[0].nodeValue;

                                        //Next Level : Get the next KML actual position's coords
                                        if (north < coords_3[k,1] && south > coords_3[k,2]  && east < coords_3[k,3] && west > coords_3[k,4]){
                                            this.ioDriverXML_3 = new IoDriverXML();
                                            this.ioDriverXML_3.read(url_href_3[k]).then(function(result_3){

                                                var kml_3 = [];
                                                kml_3 = result_3.getElementsByTagName("href");

                                                for (l=0; l<kml_3.length; l++){
                                                    var url_href_4 = [];
                                                    url_href_4[l] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'SPM' + "/" + kml_3[l].childNodes[0].nodeValue.replace("../../", "");
                                                    //console.log(url_href_4[l]);

                                                    var coords_4 = [];
                                                    coords_4[l,1] = result_1.getElementsByTagName("north")[l].childNodes[0].nodeValue;
                                                    coords_4[l,2] = result_1.getElementsByTagName("south")[l].childNodes[0].nodeValue;
                                                    coords_4[l,3] = result_1.getElementsByTagName("east")[l].childNodes[0].nodeValue;
                                                    coords_4[l,4] = result_1.getElementsByTagName("west")[l].childNodes[0].nodeValue;

                                                }

                                            });
                                        }
                                    }

                                });
                            }

                        }

                    });

                }


 */
