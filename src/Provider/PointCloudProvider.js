import * as THREE from 'three';
import Extent from 'Core/Geographic/Extent';

const CLOUD_ID_WORD_COUNT = 1;
const MAX_CLOUDS = 2 ** (CLOUD_ID_WORD_COUNT * 16);

const POINT_ID_WORD_COUNT = 2;
const MAX_POINTS_PER_CLOUD = 2 ** (POINT_ID_WORD_COUNT * 16);

const ID_WORD_COUNT = POINT_ID_WORD_COUNT + CLOUD_ID_WORD_COUNT;

let nextuuid = 1;
/**
 * Generate a unique ID for every point in a cloud.
 * @param {THREE.Points} points - The point cloud to add IDs to.
 * @returns {THREE.Points} The resulting point cloud.
 */
function addPickingAttribute(points) {
    const numPoints = points.geometry.attributes.position.count;
    const cloudId = nextuuid++;

    if (
        numPoints >= MAX_POINTS_PER_CLOUD ||
        cloudId > MAX_CLOUDS
    ) {
        console.warn(
            `Too many points or clouds: ${numPoints} points and ${cloudId} clouds.\n` +
            `Picking is currently limited to Points with less than ${MAX_POINTS_PER_CLOUD} elements and less than ${MAX_CLOUDS} Points instances`,
        );
        return points;
    }

    // Generate and store an ID for every single point
    const ids = new Uint16Array(ID_WORD_COUNT * numPoints);
    for (let pointId = 0; pointId < numPoints; pointId++) {
        // Full ID:
        //   word  word word
        //   \__/  \_______/
        //  cloudId pointId
        ids[ID_WORD_COUNT * pointId + 2] = pointId & 0x0000_ffff;
        ids[ID_WORD_COUNT * pointId + 1] = (pointId & 0xffff_0000) >> 16;
        ids[ID_WORD_COUNT * pointId] = cloudId;
    }

    points.baseId = cloudId;
    points.geometry.setAttribute(
        'unique_id',
        new THREE.BufferAttribute(ids, 3, true),
    );
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
            points.position.copy(geometry.userData.origin || node.bbox.min);
            points.scale.copy(layer.scale);
            points.updateMatrix();
            points.tightbbox = geometry.boundingBox.applyMatrix4(points.matrix);
            points.layer = layer;
            points.extent = Extent.fromBox3(
                command.view.referenceCrs,
                node.bbox,
            );
            points.userData.node = node;
            return points;
        });
    },
};
