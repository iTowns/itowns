import * as THREE from 'three';
import SchemeTile from '../Core/Geographic/SchemeTile';

function frustumCullingOBB(node, camera) {
    return camera.isBox3DVisible(node.OBB().box3D, node.OBB().matrixWorld);
}

export function planarCulling(node, camera) {
    return !frustumCullingOBB(node, camera);
}

function computeNodeSSE(camera, node) {
    var vFOV = camera.FOV * Math.PI / 180;

    const tmp1 = new THREE.Vector3();
    tmp1.setFromMatrixPosition(node.matrixWorld);
    const tmp2 = new THREE.Vector3();
    tmp2.setFromMatrixPosition(camera.camera3D.matrixWorld);
    var diff = tmp2.sub(tmp1);
    const dim = node.extent.dimensions();

    var d = Math.max(0.1, diff.length() - (new THREE.Vector3(dim.x, dim.y, dim.z)).length() * 0.5);
    var height = 2 * Math.tan(vFOV / 2) * d;

    var dot = diff.normalize().z;

    var ratio = (dim.x * dot) / height;

    if (ratio >= 0.25) {
        return 7;
    }
    return 1;
}

export function planarSubdivisionControl(maxLevel, threshold) {
    return function _planarSubdivisionControl(context, layer, node) {
        if (maxLevel <= node.level) {
            return false;
        }
        // don't allow subdivision if tile does'nt have at least:
        //  - 1 elevation texture
        if (!node.isElevationLayerLoaded()) {
            return false;
        }
        //  - 1 color texture
        if (node.materials[0].loadedTexturesCount[1] == 0) {
            return false;
        }

        const sse = computeNodeSSE(context.camera, node);

        return threshold < sse;
    };
}

export function planarSchemeTile(bbox) {
    const planeSchemeTile = new SchemeTile();
    planeSchemeTile.add(bbox);
    return planeSchemeTile;
}
