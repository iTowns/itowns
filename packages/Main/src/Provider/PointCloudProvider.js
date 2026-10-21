import * as THREE from 'three';
import { allocatePickingIds } from 'Utils/PointCloudPickingUtils';

function addPickingAttribute(points) {
    // generate unique id for picking
    const numPoints = points.geometry.attributes.position.count;
    if (numPoints === 0) {
        return points;
    }

    // Reserve a contiguous range of ids: the id of the point `i` is
    // `baseId + i`, encoded as a big endian 32 bits integer.
    const baseId = allocatePickingIds(numPoints);
    if (baseId < 0) {
        console.warn('Picking is disabled for this node: no more picking ids available (more than 2^32 points are loaded)');
        return points;
    }

    const ids = new Uint8Array(4 * numPoints);
    for (let i = 0; i < numPoints; i++) {
        const v = baseId + i;
        ids[4 * i + 0] = (v & 0xff000000) >> 24;
        ids[4 * i + 1] = (v & 0x00ff0000) >> 16;
        ids[4 * i + 2] = (v & 0x0000ff00) >> 8;
        ids[4 * i + 3] = (v & 0x000000ff) >> 0;
    }

    points.baseId = baseId;
    points.geometry.setAttribute('unique_id', new THREE.BufferAttribute(ids, 4, true));
    return points;
}

export default {
    executeCommand(command) {
        const layer = command.layer;
        const node = command.requester;

        return node.load().then((geometry) => {
            const points = new THREE.Points(geometry, layer.material);
            addPickingAttribute(points);
            points.frustumCulled = false;
            points.matrixAutoUpdate = false;
            points.position.fromArray(geometry.userData.position);
            points.quaternion.fromArray(geometry.userData.quaternion).invert();
            points.updateMatrix();

            points.layer = layer;
            points.userData.node = node;
            return points;
        });
    },
};
