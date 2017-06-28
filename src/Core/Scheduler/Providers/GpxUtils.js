/**
 * Generated On: 2016-07-07
 * Class: GpxUtils
 * Description: Parse Gpx file to get [lat, lon, alt]
 */

import * as THREE from 'three';
import Fetcher from './Fetcher';
import Coordinates from '../../Geographic/Coordinates';

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
        const positions = new Float32Array(wayPts.length * 3);
        for (var i = 0; i < wayPts.length; i++) {
            const pos = _gpxPtToCartesian(wayPts[i]);
            pos.toArray(positions, 3 * i);
        }
        const points = new THREE.Points();
        points.geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
        points.material.color.setRGB(0, 1, 0);
        return points;
    } else {
        return null;
    }
}

function _gpxToWTrackPointsMesh(gpxXML) {
    var trackPts = _gGpxToWTrackPointsArray(gpxXML);

    if (trackPts.length) {
        const positions = new Float32Array(trackPts.length * 3);
        for (var i = 0; i < trackPts.length; i++) {
            const pos = _gpxPtToCartesian(trackPts[i]);
            pos.toArray(positions, 3 * i);
        }

        const line = new THREE.Line();
        line.geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
        line.material.color.setRGB(1, 0, 0);
        line.material.linewidth = 100;

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

    return gpxMesh;
}

export default function loadGpx(urlFile, networkOptions) {
    return Fetcher.xml(urlFile, networkOptions).then(gpxXML => _gpxToMesh(gpxXML));
}

