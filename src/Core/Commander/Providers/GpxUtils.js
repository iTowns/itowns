/**
 * Generated On: 2016-07-07
 * Class: GpxUtils
 * Description: Parse Gpx file to get [lat, lon, alt]
 */

import * as THREE from 'three';
import Fetcher from './Fetcher';
import Coordinates from '../../Geographic/Coordinates';
import ItownsLine from './ItownsLine';
import ItownsPoint from './ItownsPoint';

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

    return new Coordinates('EPSG:4326', longitude, latitude, elevation);
}

function _gpxToWayPointsMesh(gpxXML) {
    var wayPts = _gpxToWayPointsArray(gpxXML);

    if (wayPts.length) {
        var colorPoint = new THREE.Color('rgb(0, 255, 0)');
        var points = new ItownsPoint({
            time: 1.0,
            useTexture: false,
            texture: 'data/strokes/pstar1.png',
            color: [colorPoint.r, colorPoint.g, colorPoint.b],
            opacity: 1.0,
        });

        for (var i = 0; i < wayPts.length; i++) {
            points.addPoint(_gpxPtToCartesian(wayPts[i]), colorPoint, 600.0);
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
        var geometry = new THREE.BufferGeometry();
        var material = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 });
        var positions = new Float32Array( trackPts.length * 3 );

        const geo = [];
        for (var k = 0; k < trackPts.length; k++) {
            const g = _gpxPtToCartesian(trackPts[k]);

            geo.push(g);
            const xyz = g.as('EPSG:4978').xyz();
            positions[3*k] = xyz.x;
            positions[3*k+1] = xyz.y;
            positions[3*k+2] = xyz.z;
        }

        geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
        geometry.computeBoundingSphere();
        const result = new THREE.Line( geometry, material );
        result.positionsGeo = geo;
        return result;


        var colorLine = new THREE.Color('rgb(0, 0, 255)');
        var line = new ItownsLine({
            time: 1.0,
            linewidth: 100.0,
            texture: 'data/strokes/hway1.png',
            useTexture: false,
            opacity: 1.0,
            sizeAttenuation: 1.0,
            color: [colorLine.r, colorLine.g, colorLine.b],
        });

        for (var k = 0; k < trackPts.length; k++) {
            line.addPoint(_gpxPtToCartesian(trackPts[k]));
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

    return gpxMesh;
}

export default function loadGpx(urlFile) {
    return Fetcher.xml(urlFile).then(gpxXML => _gpxToMesh(gpxXML));
}

