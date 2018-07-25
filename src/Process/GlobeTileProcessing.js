import * as THREE from 'three';
import { ellipsoidSizes } from '../Core/Geographic/Coordinates';
import { SIZE_TEXTURE_TILE } from '../Provider/OGCWebServiceHelper';
import Extent from '../Core/Geographic/Extent';
import { l_ELEVATION } from '../Renderer/LayeredMaterialConstants';

const cV = new THREE.Vector3();
let vhMagnitudeSquared;

let SSE_SUBDIVISION_THRESHOLD;

const worldToScaledEllipsoid = new THREE.Matrix4();

export function preGlobeUpdate(context, layer) {
    // We're going to use the method described here:
    //    https://cesiumjs.org/2013/04/25/Horizon-culling/
    // This method assumes that the globe is a unit sphere at 0,0,0 so
    // we setup a world-to-scaled-ellipsoid matrix4
    worldToScaledEllipsoid.getInverse(layer.object3d.matrixWorld);
    worldToScaledEllipsoid.premultiply(
        new THREE.Matrix4().makeScale(
            1 / ellipsoidSizes().x,
            1 / ellipsoidSizes().y,
            1 / ellipsoidSizes().z));

    // pre-horizon culling
    // cV is camera's position in worldToScaledEllipsoid system
    cV.copy(context.camera.camera3D.position).applyMatrix4(worldToScaledEllipsoid);
    vhMagnitudeSquared = cV.lengthSq() - 1.0;

    const elevationLayers = context.view.getLayers((l, a) => a && a.id == layer.id && l.type == 'elevation');
    context.maxElevationLevel = -1;
    for (const e of elevationLayers) {
        context.maxElevationLevel = Math.max(e.options.zoom.max, context.maxElevationLevel);
    }
    if (context.maxElevationLevel == -1) {
        context.maxElevationLevel = Infinity;
    }
}

const vT = new THREE.Vector3();
function pointHorizonCulling(pt) {
    // see https://cesiumjs.org/2013/04/25/Horizon-culling/

    vT.copy(pt);
    vT.applyMatrix4(worldToScaledEllipsoid).sub(cV);

    const vtMagnitudeSquared = vT.lengthSq();

    const dot = -vT.dot(cV);

    const isOccluded =
        vhMagnitudeSquared < dot &&
        vhMagnitudeSquared < ((dot * dot) / vtMagnitudeSquared);

    return isOccluded;
}

function horizonCulling(node) {
    const points = node.OBB().topPointsWorld;

    for (const point of points) {
        if (!pointHorizonCulling(point)) {
            return true;
        }
    }
    return false;
}

function frustumCullingOBB(node, camera) {
    return camera.isBox3Visible(node.OBB().box3D, node.OBB().matrixWorld);
}

export function globeCulling(minLevelForHorizonCulling) {
    return function _globeCulling(node, camera) {
        return !(frustumCullingOBB(node, camera) && (node.level < minLevelForHorizonCulling || horizonCulling(node)));
    };
}

const v = new THREE.Vector3();
function computeNodeSSE(camera, node) {
    v.setFromMatrixScale(node.matrixWorld);
    const boundingSphereCenter = node.boundingSphere.center.clone().applyMatrix4(node.matrixWorld);
    const distance = Math.max(
        0.0,
        camera.camera3D.position.distanceTo(boundingSphereCenter) - node.boundingSphere.radius * v.x);

    // Removed because is false computation, it doesn't consider the altitude of node
    // Added small oblique weight (distance is not enough, tile orientation is needed)
    /*
    var altiW = node.bbox.top() === 10000 ? 0. : node.bbox.bottom() / 10000.;
    var dotProductW = Math.min(altiW + Math.abs(this.camera3D.getWorldDirection().dot(node.centerSphere.clone().normalize())), 1.);
    if (this.camera3D.position.length() > 6463300) dotProductW = 1;
    var SSE = Math.sqrt(dotProductW) * this.preSSE * (node.geometricError / distance);
    */

    // TODO: node.geometricError is computed using a hardcoded 18 level
    // The computation of node.geometricError is surely false
    return camera._preSSE * (node.geometricError * v.x) / distance;
}

export function globeSubdivisionControl(minLevel, maxLevel, sseThreshold, maxDeltaElevationLevel) {
    SSE_SUBDIVISION_THRESHOLD = sseThreshold;
    return function _globeSubdivisionControl(context, layer, node) {
        if (node.level < minLevel) {
            return true;
        }
        if (maxLevel <= node.level) {
            return false;
        }
        // Prevent to subdivise the node if the current elevation level
        // we must avoid a tile, with level 20, inherits a level 3 elevation texture.
        // The induced geometric error is much too large and distorts the SSE
        const currentTexture = node.material.textures[l_ELEVATION][0];
        if (currentTexture.extent) {
            const offsetScale = node.material.offsetScale[l_ELEVATION][0];
            const ratio = offsetScale.z;
            // ratio is node size / texture size
            if (ratio < 1 / Math.pow(2, maxDeltaElevationLevel)) {
                return false;
            }
        }

        const sse = computeNodeSSE(context.camera, node);

        return SSE_SUBDIVISION_THRESHOLD < sse;
    };
}

// bbox longitude(0,360),latitude(-90,90)
export const globeSchemeTile0 = 0;
// bbox longitude(-180,180),latitude(-90,90)
export const globeSchemeTile1 = 1;

export function globeSchemeTileWMTS(type) {
    const schemeT = [];

    if (type === 0) {
        // bbox longitude(0,360),latitude(-90,90)
        schemeT.push(new Extent('EPSG:4326', 0, 180, -90, 90));
        schemeT.push(new Extent('EPSG:4326', 180, 360, -90, 90));
    } else if (type == 1) {
        // bbox longitude(-180,180),latitude(-90,90)
        schemeT.push(new Extent('EPSG:4326', -180, 0, -90, 90));
        schemeT.push(new Extent('EPSG:4326', 0, 180, -90, 90));
    }
    return schemeT;
}

export function computeTileZoomFromDistanceCamera(distance, view) {
    const sizeEllipsoid = ellipsoidSizes().x;
    const preSinus = SIZE_TEXTURE_TILE * (SSE_SUBDIVISION_THRESHOLD * 0.5) / view.camera.preSSE / sizeEllipsoid;

    let sinus = distance * preSinus;
    let zoom = Math.log(Math.PI / (2.0 * Math.asin(sinus))) / Math.log(2);

    const delta = Math.PI / Math.pow(2, zoom);
    const circleChord = 2.0 * sizeEllipsoid * Math.sin(delta * 0.5);
    const radius = circleChord * 0.5;

    // adjust with bounding sphere rayon
    sinus = (distance - radius) * preSinus;
    zoom = Math.log(Math.PI / (2.0 * Math.asin(sinus))) / Math.log(2);

    return isNaN(zoom) ? 0 : Math.round(zoom);
}

export function computeDistanceCameraFromTileZoom(zoom, view) {
    const delta = Math.PI / Math.pow(2, zoom);
    const circleChord = 2.0 * ellipsoidSizes().x * Math.sin(delta * 0.5);
    const radius = circleChord * 0.5;
    const error = radius / SIZE_TEXTURE_TILE;

    return view.camera.preSSE * error / (SSE_SUBDIVISION_THRESHOLD * 0.5) + radius;
}
