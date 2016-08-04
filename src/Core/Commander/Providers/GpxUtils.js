/**
 * Generated On: 2016-07-07
 * Class: GpxUtils
 * Description: Parse Gpx file to get [lat, lon, alt]
 */

import THREE from 'THREE';
import IoDriverXML from 'Core/Commander/Providers/IoDriverXML';
import CoordCarto from 'Core/Geographic/CoordCarto';
import ItownsLine from 'Core/Commander/Providers/ItownsLine';
import ItownsPoint from 'Core/Commander/Providers/ItownsPoint';


function _gpxToWayPointsArray(gpxXML) {
    return gpxXML.getElementsByTagName("wpt");
}

function _gGpxToWTrackPointsArray(gpxXML) {
    return gpxXML.getElementsByTagName("trkpt");
}

function _gpxPtToCartesian(pt,ellipsoid) {
    var coordCarto = new CoordCarto();

    var longitude = Number(pt.attributes.lon.nodeValue);
    var latitude = Number(pt.attributes.lat.nodeValue);
    var elevation = Number(pt.getElementsByTagName("ele")[0].childNodes[0].nodeValue);

    return ellipsoid.cartographicToCartesian(coordCarto.setFromDegreeGeo(longitude,latitude,elevation));
}

function _gpxToWayPointsMesh(gpxXML,ellipsoid) {
    var wayPts = _gpxToWayPointsArray(gpxXML);

    if(wayPts.length) {
        var colorPoint = new THREE.Color("rgb(0, 255, 0)");
        var points = new ItownsPoint({
                time : 1.0,
                useTexture : false,
                texture : "data/strokes/pstar1.png",
                color   : [colorPoint.r, colorPoint.g, colorPoint.b],
                opacity : 1.0
        });

        for (var i = 0; i < wayPts.length; i++) {
            points.addPoint(_gpxPtToCartesian(wayPts[i],ellipsoid),colorPoint,600.0);
        }

        points.process();

        return points;
    } else {
        return null;
    }
}

function _gpxToWTrackPointsMesh(gpxXML,ellipsoid) {
    var trackPts = _gGpxToWTrackPointsArray(gpxXML);

    if(trackPts.length){
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

        for (var k=0; k < trackPts.length ; k++){
            line.addPoint(_gpxPtToCartesian(trackPts[k],ellipsoid));
        }

        line.process();

        return line;
    } else {
        return null;
    }
}

function _gpxToMesh(gpxXML,ellipsoid) {
    if (!gpxXML) {
        return undefined;
    }

    var gpxMesh = new THREE.Object3D();

    //Getting the track points
    var trackPts = _gpxToWTrackPointsMesh(gpxXML,ellipsoid);

    if (trackPts) {
        gpxMesh.add(trackPts);
    }

    // Getting the waypoint points
    var wayPts = _gpxToWayPointsMesh(gpxXML,ellipsoid);

    if (wayPts) {
        gpxMesh.add(wayPts);
    }

    return gpxMesh;

}

export default function loadGpx(urlFile,ellipsoid) {
    var ioDriverXML = new IoDriverXML();

    return ioDriverXML.read(urlFile).then(
        function(gpxXML) {
            return _gpxToMesh(gpxXML,ellipsoid);
        });
}

