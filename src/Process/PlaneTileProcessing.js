import * as THREE from 'three';

import SchemeTile from 'Scene/SchemeTile';
import { UNIT } from 'Core/Geographic/GeoCoordinate';

const quaternion = new THREE.Quaternion();
const SSE_SUBDIVISION_THRESHOLD = 6.0;

function frustumCullingOBB(node, camera) {
    // position in local space
    var position = node.OBB().worldToLocal(camera.position().clone());
    // position.z -= node.distance;

    quaternion.multiplyQuaternions(node.OBB().inverseQuaternion(), camera.camera3D.quaternion);

    return camera.getFrustumLocalSpace(position, quaternion).intersectsBox(node.OBB().box3D);
}

export function planeCulling(node, camera) {
    return !frustumCullingOBB(node, camera);
}

function computeNodeSSE(camera, node) {
    var vFOV = camera.FOV * Math.PI / 180;

    var diff = camera.camera3D.getWorldPosition().clone().sub(node.getWorldPosition());
    var d = Math.max(0.1, diff.length() - node.bbox.size * 0.5);
    var height = 2 * Math.tan(vFOV / 2) * d;

    var dot = diff.normalize().z;

    var ratio = (node.bbox.dimension.x * dot) / height;

    if (ratio >= 0.25) {
        return 7;
    }
    return 1;
}

export function planeSubdivisionControl(context, layer, node) {
    if (node.level < 2) {
        return true;
    }
    if (layer.maxLevel <= node.level) {
        return false;
    }

    const sse = computeNodeSSE(context.camera, node);

    return SSE_SUBDIVISION_THRESHOLD < sse;
}

export function planeSchemeTile(bbox) {
    const planeSchemeTile = new SchemeTile();
    planeSchemeTile.add(
        bbox.minCoordinate.x(UNIT.METER), bbox.maxCoordinate.x(UNIT.METER),
        bbox.minCoordinate.y(UNIT.METER), bbox.maxCoordinate.y(UNIT.METER),
        UNIT.METER);
    return planeSchemeTile;
}
