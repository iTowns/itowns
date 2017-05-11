/**
 * Generated On: 2016-07-07
 * Class: GpxUtils
 * Description: Parse Gpx file to get [lat, lon, alt]
 */

import * as THREE from 'three';
import Fetcher from './Fetcher';
import Coordinates from '../../Geographic/Coordinates';
import Lines from '../../../Renderer/Lines';
import Points from '../../../Renderer/Points';

function _gpxToWayPointsArray(gpxXML) {
    return gpxXML.getElementsByTagName('wpt');
}

function _gGpxToWTrackPointsArray(gpxXML) {
    return gpxXML.getElementsByTagName('trkpt');
}

function _gpxPtToCartesian(pt) {
    var longitude = Number(pt.attributes.lon.nodeValue);
    var latitude = Number(pt.attributes.lat.nodeValue);
    var elevation = Number(pt.getElementsByTagName('ele')[0].childNodes[0].nodeValue);

    return new Coordinates('EPSG:4326', longitude, latitude, elevation).as('EPSG:4978').xyz();
}

function _gpxToWayPointsMesh(gpxXML) {
    var wayPts = _gpxToWayPointsArray(gpxXML);

    if (wayPts.length) {
        var colorPoint = new THREE.Color('rgb(0, 255, 0)');
        var points = new Points({
            useTexture: false,
            color: [colorPoint.r, colorPoint.g, colorPoint.b],
            opacity: 1.0,
        });

        for (var i = 0; i < wayPts.length; i++) {
            if (gpxXML.center === undefined) {
                gpxXML.center = _gpxPtToCartesian(wayPts[0]);
            }
            points.addPoint(_gpxPtToCartesian(wayPts[i]).sub(gpxXML.center), colorPoint, 600.0);
        }

        points.process();

        return points;
    } else {
        return null;
    }
}

function _gpxToWTrackPointsMesh(gpxXML) {
    var trackPts = _gGpxToWTrackPointsArray(gpxXML);

    if (trackPts.length) {
        var colorLine = new THREE.Color('rgb(255, 0, 0)');
        var line = new Lines({
            linewidth: 20.0,
            useTexture: false,
            opacity: 1.0,
            sizeAttenuation: false,
            color: [colorLine.r, colorLine.g, colorLine.b],
        });

        for (var k = 0; k < trackPts.length; k++) {
            if (gpxXML.center === undefined) {
                gpxXML.center = _gpxPtToCartesian(trackPts[0]);
            }
            line.addPoint(_gpxPtToCartesian(trackPts[k]).sub(gpxXML.center));
        }

        line.process();

        return line;
    } else {
        return null;
    }
}

function _gpxToMesh(gpxXML) {
    if (!gpxXML) {
        return undefined;
    }

    var gpxMesh = new THREE.Object3D();

    // Getting the track points
    var trackPts = _gpxToWTrackPointsMesh(gpxXML);

    if (trackPts) {
        gpxMesh.add(trackPts);
    }

    // Getting the waypoint points
    var wayPts = _gpxToWayPointsMesh(gpxXML);

    if (wayPts) {
        gpxMesh.add(wayPts);
    }

    gpxMesh.matrixWorld.elements = new Float64Array(16);
    gpxMesh.matrix.elements = new Float64Array(16);
    gpxMesh.position.copy(gpxXML.center);
    gpxMesh.updateMatrix();
    gpxMesh.updateMatrixWorld(true);
    gpxMesh.matrixAutoUpdate = false;
    gpxMesh.matrixWorldNeedsUpdate = false;

    return gpxMesh;
}

export default function loadGpx(urlFile) {
    return Fetcher.xml(urlFile).then(gpxXML => _gpxToMesh(gpxXML));
}

