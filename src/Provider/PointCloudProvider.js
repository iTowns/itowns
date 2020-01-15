import * as THREE from 'three';
import Fetcher from 'Provider/Fetcher';
import Extent from 'Core/Geographic/Extent';
import { parseOctree } from 'Layer/PointCloudLayer';

let nextuuid = 1;
function addPickingAttribute(points) {
    // generate unique id for picking
    const numPoints = points.geometry.attributes.position.count;
    const ids = new Uint8Array(4 * numPoints);
    const baseId = nextuuid++;
    if (numPoints > 0xffff || baseId > 0xffff) {
        // TODO: fixme
        console.warn('Currently picking is limited to Points with less than 65535 elements and less than 65535 Points instances');
        return points;
    }
    for (let i = 0; i < numPoints; i++) {
        // todo numpoints > 16bits
        const v = (baseId << 16) | i;
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
        const metadata = command.requester;

        // Query HRC if we don't have children metadata yet.
        if (metadata.childrenBitField && metadata.children.length === 0) {
            parseOctree(layer, layer.metadata.hierarchyStepSize, metadata).then(() => command.view.notifyChange(layer, false));
        }

        // `isLeaf` is for lopocs and allows the pointcloud server to consider that the current
        // node is the last one, even if we could subdivide even further.
        // It's necessary because lopocs doens't know about the hierarchy (it generates it on the fly
        // when we request .hrc files)
        const url = `${metadata.baseurl}/r${metadata.name}.${layer.extension}?isleaf=${command.isLeaf ? 1 : 0}`;

        return Fetcher.arrayBuffer(url, layer.fetchOptions).then(buffer => layer.parse(buffer, layer.metadata.pointAttributes)).then((geometry) => {
            const points = new THREE.Points(geometry, layer.material.clone());
            addPickingAttribute(points);
            points.frustumCulled = false;
            points.matrixAutoUpdate = false;
            points.position.copy(metadata.bbox.min);
            points.scale.set(layer.metadata.scale, layer.metadata.scale, layer.metadata.scale);
            points.updateMatrix();
            points.tightbbox = geometry.boundingBox.applyMatrix4(points.matrix);
            points.layers.set(layer.threejsLayer);
            points.layer = layer;
            points.extent = Extent.fromBox3(command.view.referenceCrs, metadata.bbox);
            points.userData.metadata = metadata;
            return points;
        });
    },
};
