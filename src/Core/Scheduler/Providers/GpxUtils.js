/**
 * Generated On: 2016-07-07
 * Class: GpxUtils
 * Description: Parse Gpx file to get [lat, lon, alt]
 */

import * as THREE from 'three';
import Line from 'three.meshline';
import Fetcher from './Fetcher';
import Coordinates from '../../Geographic/Coordinates';
import Capabilities from '../../System/Capabilities';
import { patchMaterialForLogDepthSupport } from './3dTiles_Provider';

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

const geometryPoint = new THREE.BoxGeometry(1, 1, 80);
const materialPoint = new THREE.MeshBasicMaterial({ color: 0xffffff });
const positionCamera = new THREE.Vector3();

function getDistance(object, camera) {
    const point = object.geometry.boundingSphere.center.clone().applyMatrix4(object.matrixWorld);
    positionCamera.setFromMatrixPosition(camera.matrixWorld);
    return positionCamera.distanceTo(point);
}

function updatePointScale(renderer, scene, camera) {
    const distance = getDistance(this, camera);
    const scale = Math.max(2, Math.min(100, distance / renderer.getSize().height));
    this.scale.set(scale, scale, scale);
    this.updateMatrixWorld();
}

function _gpxToWayPointsMesh(gpxXML) {
    var wayPts = _gpxToWayPointsArray(gpxXML);

    if (wayPts.length) {
        const points = new THREE.Group();

        gpxXML.center = gpxXML.center || _gpxPtToCartesian(wayPts[0], crs);

        const lookAt = gpxXML.center.clone().negate();

        for (const wayPt of wayPts) {
            const position = _gpxPtToCartesian(wayPt).sub(gpxXML.center);
            // use Pin to make it more visible
            const mesh = new THREE.Mesh(geometryPoint, materialPoint);
            mesh.position.copy(position);
            mesh.lookAt(lookAt);

            // Scale pin in function of distance
            mesh.onBeforeRender = updatePointScale;

            points.add(mesh);
        }
        return points;
    } else {
        return null;
    }
}

function updatePath(renderer, scene, camera) {
    const distance = getDistance(this, camera);
    this.material.depthTest = distance < this.geometry.boundingSphere.radius * 2;
    const size = renderer.getSize();
    this.material.uniforms.resolution.value.set(size.width, size.height);
}

function _gpxToWTrackPointsMesh(gpxXML) {
    var trackPts = _gGpxToWTrackPointsArray(gpxXML);

    if (trackPts.length) {
        gpxXML.center = gpxXML.center || _gpxPtToCartesian(trackPts[0], crs);

        var geometry = new THREE.Geometry();

        for (const trackPt of trackPts) {
            const point = _gpxPtToCartesian(trackPt, crs).sub(gpxXML.center);
            geometry.vertices.push(point);
        }

        var line = new Line.MeshLine();
        line.setGeometry(geometry);
        // Due to limitations in the ANGLE layer,
        // with the WebGL renderer on Windows platforms
        // linewidth will always be 1 regardless of the set value
        // Use MeshLine to fix it
        var material = new Line.MeshLineMaterial({
            lineWidth: 12,
            sizeAttenuation: 0,
            color: new THREE.Color(0xFF0000),
        });

        if (Capabilities.isLogDepthBufferSupported()) {
            material.fragmentShader = material.fragmentShader.replace(/.*/, '').substr(1);
            patchMaterialForLogDepthSupport(material);
            // eslint-disable-next-line no-console
            console.warn('MeshLineMaterial shader has been patched to add log depth buffer support');
        }

        const pathMesh = new THREE.Mesh(line.geometry, material);
        // update size screen uniform
        // update depth test for visibilty path, because of the proximity of the terrain and gpx mesh
        pathMesh.onBeforeRender = updatePath;

        return pathMesh;
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

    gpxMesh.position.copy(gpxXML.center);
    gpxMesh.updateMatrixWorld();
    // gpxMesh is static data, it doens't need matrix update
    gpxMesh.matrixAutoUpdate = false;

    return gpxMesh;
}

export default function loadGpx(urlFile, networkOptions) {
    return Fetcher.xml(urlFile, networkOptions).then(gpxXML => _gpxToMesh(gpxXML));
}

