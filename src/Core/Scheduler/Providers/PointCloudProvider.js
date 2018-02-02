import * as THREE from 'three';
import Fetcher from './Fetcher';
import PointCloudProcessing from '../../../Process/PointCloudProcessing';
import PotreeBinLoader from './PotreeBinLoader';
import PotreeCinLoader from './PotreeCinLoader';
import Picking from '../../Picking';

// Create an A(xis)A(ligned)B(ounding)B(ox) for the child `childIndex` of one aabb.
// (PotreeConverter protocol builds implicit octree hierarchy by applying the same
// subdivision algo recursively)
function createChildAABB(aabb, childIndex) {
    // Code taken from potree
    var min = aabb.min;
    var max = aabb.max;
    var dHalfLength = new THREE.Vector3().copy(max).sub(min).multiplyScalar(0.5);
    var xHalfLength = new THREE.Vector3(dHalfLength.x, 0, 0);
    var yHalfLength = new THREE.Vector3(0, dHalfLength.y, 0);
    var zHalfLength = new THREE.Vector3(0, 0, dHalfLength.z);

    var cmin = min;
    var cmax = new THREE.Vector3().add(min).add(dHalfLength);

    if (childIndex === 1) {
        min = new THREE.Vector3().copy(cmin).add(zHalfLength);
        max = new THREE.Vector3().copy(cmax).add(zHalfLength);
    } else if (childIndex === 3) {
        min = new THREE.Vector3().copy(cmin).add(zHalfLength).add(yHalfLength);
        max = new THREE.Vector3().copy(cmax).add(zHalfLength).add(yHalfLength);
    } else if (childIndex === 0) {
        min = cmin;
        max = cmax;
    } else if (childIndex === 2) {
        min = new THREE.Vector3().copy(cmin).add(yHalfLength);
        max = new THREE.Vector3().copy(cmax).add(yHalfLength);
    } else if (childIndex === 5) {
        min = new THREE.Vector3().copy(cmin).add(zHalfLength).add(xHalfLength);
        max = new THREE.Vector3().copy(cmax).add(zHalfLength).add(xHalfLength);
    } else if (childIndex === 7) {
        min = new THREE.Vector3().copy(cmin).add(dHalfLength);
        max = new THREE.Vector3().copy(cmax).add(dHalfLength);
    } else if (childIndex === 4) {
        min = new THREE.Vector3().copy(cmin).add(xHalfLength);
        max = new THREE.Vector3().copy(cmax).add(xHalfLength);
    } else if (childIndex === 6) {
        min = new THREE.Vector3().copy(cmin).add(xHalfLength).add(yHalfLength);
        max = new THREE.Vector3().copy(cmax).add(xHalfLength).add(yHalfLength);
    }

    return new THREE.Box3(min, max);
}


function parseOctree(layer, hierarchyStepSize, root) {
    return Fetcher.arrayBuffer(`${root.baseurl}/r${root.name}.hrc`, layer.fetchOptions).then((blob) => {
        const view = new DataView(blob);

        const stack = [];

        let offset = 0;

        root.childrenBitField = view.getUint8(0); offset += 1;
        root.numPoints = view.getUint32(1, true); offset += 4;
        root.children = [];

        stack.push(root);

        while (stack.length && offset < blob.byteLength) {
            const snode = stack.shift();
            // look up 8 children
            for (let i = 0; i < 8; i++) {
                // does snode have a #i child ?
                if (snode.childrenBitField & (1 << i) && (offset + 5) <= blob.byteLength) {
                    const c = view.getUint8(offset); offset += 1;
                    let n = view.getUint32(offset, true); offset += 4;
                    if (n == 0) {
                        n = root.numPoints;
                    }
                    const childname = snode.name + i;
                    const bounds = createChildAABB(snode.bbox, i);

                    let url = root.baseurl;
                    if ((childname.length % hierarchyStepSize) == 0) {
                        const myname = childname.substr(root.name.length);
                        url = `${root.baseurl}/${myname}`;
                    }
                    const item = { numPoints: n, childrenBitField: c, children: [], name: childname, baseurl: url, bbox: bounds };
                    snode.children.push(item);
                    stack.push(item);
                }
            }
        }

        return root;
    });
}

let nextuuid = 1;
function addPickingAttribute(points) {
    // generate unique id for picking
    const numPoints = points.geometry.attributes.position.count;
    const ids = new Uint8Array(4 * numPoints);
    const baseId = nextuuid++;
    if (numPoints > 0xffff || baseId > 0xffff) {
        // TODO: fixme
        // eslint-disable-next-line no-console
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
    points.geometry.addAttribute('unique_id', new THREE.BufferAttribute(ids, 4, true));
    return points;
}


function loadPointFile(layer, url) {
    return fetch(url, layer.fetchOptions).then(foo => foo.arrayBuffer()).then((ab) => {
        if (layer.metadata.customBinFormat) {
            return addPickingAttribute(PotreeCinLoader.parse(ab));
        } else {
            return addPickingAttribute(PotreeBinLoader.parse(ab));
        }
    });
}

export default {
    preprocessDataLayer(layer) {
        if (!layer.file) {
            layer.file = 'cloud.js';
        }
        if (!layer.group) {
            layer.group = new THREE.Group();
            layer.object3d.add(layer.group);
            layer.group.updateMatrixWorld();
        }

        if (!layer.bboxes) {
            layer.bboxes = new THREE.Group();
            layer.object3d.add(layer.bboxes);
            layer.bboxes.updateMatrixWorld();
        }

        // default options
        layer.fetchOptions = layer.fetchOptions || {};
        layer.octreeDepthLimit = layer.octreeDepthLimit || -1;
        layer.pointBudget = layer.pointBudget || 15000000;
        layer.pointSize = layer.pointSize === 0 || !isNaN(layer.pointSize) ? layer.pointSize : 4;
        layer.overdraw = layer.overdraw || 2;
        layer.type = 'geometry';

        // default update methods
        layer.preUpdate = PointCloudProcessing.preUpdate;
        layer.update = PointCloudProcessing.update;
        layer.postUpdate = PointCloudProcessing.postUpdate;

        // this probably needs to be moved to somewhere else
        layer.pickObjectsAt = (view, mouse) => Picking.pickPointsAt(view, mouse, layer);

        return Fetcher.json(`${layer.url}/${layer.file}`, layer.fetchOptions).then((cloud) => {
            layer.metadata = cloud;

            let bbox;

            // Lopocs pointcloud server can expose the same file structure as PotreeConverter output.
            // The only difference is the metadata root file (cloud.js vs infos/sources), and we can
            // check for the existence of a `scale` field.
            // (if `scale` is defined => we're fetching files from PotreeConverter)
            if (layer.metadata.scale != undefined) {
                // PotreeConverter format
                layer.metadata.customBinFormat = layer.metadata.pointAttributes === 'CIN';
                bbox = new THREE.Box3(
                    new THREE.Vector3(cloud.boundingBox.lx, cloud.boundingBox.ly, cloud.boundingBox.lz),
                    new THREE.Vector3(cloud.boundingBox.ux, cloud.boundingBox.uy, cloud.boundingBox.uz));
            } else {
                // Lopocs
                layer.metadata.scale = 1;
                layer.metadata.octreeDir = `itowns/${layer.table}.points`;
                layer.metadata.hierarchyStepSize = 1000000; // ignore this with lopocs
                layer.metadata.customBinFormat = true;

                let idx = 0;
                for (const entry of cloud) {
                    if (entry.table == layer.table) {
                        break;
                    }
                    idx++;
                }
                bbox = new THREE.Box3(
                   new THREE.Vector3(cloud[idx].bbox.xmin, cloud[idx].bbox.ymin, cloud[idx].bbox.zmin),
                   new THREE.Vector3(cloud[idx].bbox.xmax, cloud[idx].bbox.ymax, cloud[idx].bbox.zmax));
            }


            return parseOctree(
                    layer,
                    layer.metadata.hierarchyStepSize,
                    { baseurl: `${layer.url}/${cloud.octreeDir}/r`, name: '', bbox });
        }).then((root) => {
            // eslint-disable-next-line no-console
            console.log('LAYER metadata:', root);
            layer.root = root;
            return layer;
        });
    },

    executeCommand(command) {
        const layer = command.layer;
        const node = command.requester;

        // Query HRC if we don't have children metadata yet.
        if (node.childrenBitField && node.children.length === 0) {
            parseOctree(layer, layer.metadata.hierarchyStepSize, node).then(() => command.view.notifyChange(false));
        }

        const extension = layer.metadata.customBinFormat ? 'cin' : 'bin';

        // `isLeaf` is for lopocs and allows the pointcloud server to consider that the current
        // node is the last one, even if we could subdivide even further.
        // It's necessary because lopocs doens't know about the hierarchy (it generates it on the fly
        // when we request .hrc files)
        const url = `${node.baseurl}/r${node.name}.${extension}?isleaf=${command.isLeaf ? 1 : 0}`;

        return loadPointFile(layer, url).then((points) => {
            points.position.copy(node.bbox.min);
            points.scale.set(layer.metadata.scale, layer.metadata.scale, layer.metadata.scale);
            points.tightbbox.min.x *= layer.metadata.scale;
            points.tightbbox.min.y *= layer.metadata.scale;
            points.tightbbox.min.z *= layer.metadata.scale;
            points.tightbbox.max.x *= layer.metadata.scale;
            points.tightbbox.max.y *= layer.metadata.scale;
            points.tightbbox.max.z *= layer.metadata.scale;
            points.tightbbox.translate(node.bbox.min);
            points.material.transparent = layer.opacity < 1.0;
            points.material.uniforms.opacity.value = layer.opacity;
            points.updateMatrix();
            points.layers.set(layer.threejsLayer);
            points.layer = layer.id;
            return points;
        });
    },
};
