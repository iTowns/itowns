/**
 * Generated On: 2016-10-5
 * Class: MobileMappingLayer
 * Description: Layer for mobileMappingData
 */

import Layer from 'Scene/Layer';
import THREE from 'THREE';
import gfxEngine from 'Renderer/c3DEngine';
import Projection from 'Core/Geographic/Projection';
import PanoramicProvider from 'Core/Commander/Providers/PanoramicProvider';
import Ellipsoid from 'Core/Math/Ellipsoid';
import CoordCarto from 'Core/Geographic/CoordCarto';

/**
 * Layer for MobileMapping data. Up to now it is used for panoramic imagery
 * It uses a Panoramic Provider
 * @returns {MobileMappingLayer_L18.MobileMappingLayer}
 */
function MobileMappingLayer() {
    //Constructor

    Layer.call(this);

    this.panoramicMesh = null;
    this.name = "MobileMappingLayer";
    this.mainMesh = new THREE.Object3D();
    this.add(this.mainMesh);

    this.panoramicProvider = null;

    this.domElement = document;
    // this.domElement.addEventListener('mousedown', onMouseDown, false).bind(this);
    window.addEventListener('mousedown', function(event) {
        if (event.button === 2) {
            this.updateData();
        }
    }.bind(this), false);

}


MobileMappingLayer.prototype = Object.create(Layer.prototype);
MobileMappingLayer.prototype.constructor = MobileMappingLayer;



MobileMappingLayer.prototype.initiatePanoramic = function(imageOpt) {

    var imagesOptions = imageOpt || this.getDefaultOptions();
    // console.log(this.defaultOptions);
    // Create and add the MobileMappingLayer with Panoramic imagery
    this.panoramicProvider = new PanoramicProvider(imagesOptions);

    this.panoramicProvider.getTextureProjectiveMesh(2.3348138, 48.8506030, 1000).then(function(projMesh) {

        this.panoramicMesh = projMesh;
        this.mainMesh.add(this.panoramicMesh);
        gfxEngine().renderScene();

        // Move camera to panoramic center
        var panoInfo = this.panoramicProvider.panoInfo;
        var ellipsoid = new Ellipsoid(new THREE.Vector3(6378137, 6356752.3142451793, 6378137)); // Should be computed elsewhere
        var posPanoWGS84 = new CoordCarto().setFromDegreeGeo(panoInfo.longitude, panoInfo.latitude, panoInfo.altitude);
        var posPanoCartesian = ellipsoid.cartographicToCartesian(posPanoWGS84);

        this.moveCameraToScanPosition(posPanoCartesian);

    }.bind(this));
};


MobileMappingLayer.prototype.updateData = function() {

    var pos = gfxEngine().controls.getPointGlobe();
    var posWGS84 = new Projection().cartesianToGeo(pos);
    var lonDeg = posWGS84.longitude / Math.PI * 180;
    var latDeg = posWGS84.latitude / Math.PI * 180;

    // console.log("position clicked: ",pos, "wgs, longitude:", posWGS84.longitude/ Math.PI * 180, "   '",posWGS84.latitude/ Math.PI * 180, "  alti:", posWGS84.altitude);

    this.panoramicProvider.updateMaterialImages(lonDeg, latDeg, 1000).then(function(panoInfo) {

        // Move camera to new pos
        //   var panoInfo = panoInfo; //this.panoramicProvider.panoInfo;
        var ellipsoid = new Ellipsoid(new THREE.Vector3(6378137, 6356752.3142451793, 6378137)); // Should be computed elsewhere
        var posPanoWGS84 = new CoordCarto().setFromDegreeGeo(panoInfo.longitude, panoInfo.latitude, panoInfo.altitude);
        var posPanoCartesian = ellipsoid.cartographicToCartesian(posPanoWGS84);

        this.moveCameraToScanPosition(posPanoCartesian);

    }.bind(this));

};



MobileMappingLayer.prototype.moveCameraToScanPosition = function(pos) {

    var speedMove = 0.1;
    var currentPos = gfxEngine().camera.camera3D.position.clone();

    var posx = currentPos.x + (pos.x - currentPos.x) * speedMove;
    var posy = currentPos.y + (pos.y - currentPos.y) * speedMove;
    var posz = currentPos.z + (pos.z - currentPos.z) * speedMove;

    gfxEngine().camera.camera3D.position.set(posx, posy, posz);
    gfxEngine().update();
    var vCurrent = new THREE.Vector3(posx, posy, posz);
    //requestAnimSelectionAlpha(OrientedImages_Provider.smoothTransition(pos,new THREE.Vector3(posx, posy, posz)));

    if (vCurrent.distanceTo(pos) > 0.2)
        setTimeout(function() {
            this.moveCameraToScanPosition(pos, vCurrent);
        }.bind(this), 20);

};

MobileMappingLayer.prototype.getDefaultOptions = function() {

    var o = {
        // HTTP access to itowns sample datasets
        //url : "../{lod}/images/{YYMMDD}/Paris-{YYMMDD}_0740-{cam.cam}-00001_{pano.pano:07}.jpg",
        url: "../{lod}/images/{YYMMDD2}/Paris-{YYMMDD2}_0740-{cam.cam}-00001_{splitIt}.jpg",
        lods: ['itowns-sample-data'], //['itowns-sample-data-small', 'itowns-sample-data'],
        /*
        // IIP server access
            website   : "your.website.com",
            path    : "your/path",
            url : "http://{website}/cgi-bin/iipsrv.fcgi?FIF=/{path}/{YYMMDD}/Paris-{YYMMDD}_0740-{cam.id}-00001_{pano.id:07}.jp2&WID={lod.w}&QLT={lod.q}&CVT=JPEG",
            lods : [{w:32,q:50},{w:256,q:80},{w:2048,q:80}],
        */
        cam: "../dist/itowns-sample-data/cameraCalibration.json",
        pano: "../dist/itowns-sample-data/panoramicsMetaData.json",
        buildings: "../dist/itowns-sample-data/buildingFootprint.json",
        DTM: "../dist/itowns-sample-data/dtm.json",
        YYMMDD2: function() { //"filename":"Paris-140616_0740-00-00001_0000500"
            // console.log(this);
            return this.pano.filename.match("-(.*?)_")[1];
        },
        splitIt: function() {
            return this.pano.filename.split("_")[2];
        },
        YYMMDD: function() {
            var d = new Date(this.pano.date);
            return ("" + d.getUTCFullYear()).slice(-2) + ("0" + (d.getUTCMonth() + 1)).slice(-2) + ("0" + d.getUTCDate()).slice(-2);
        },
        UTCOffset: 15,
        seconds: function() {
            var d = new Date(this.pano.date);
            return (d.getUTCHours() * 60 + d.getUTCMinutes()) * 60 + d.getUTCSeconds() - this.UTCOffset;
        },
        visible: true
    };


    return o;
};


export default MobileMappingLayer;
