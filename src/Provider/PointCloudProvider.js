import * as THREE from 'three';
import Fetcher from './Fetcher';
import PointCloudProcessing from '../Process/PointCloudProcessing';
import PotreeBinParser from '../Parser/PotreeBinParser';
import PotreeCinParser from '../Parser/PotreeCinParser';
import PointsMaterial, { MODE } from '../Renderer/PointsMaterial';
import Picking from '../Core/Picking';
import Extent from '../Core/Geographic/Extent';

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
                    const item = {
                        numPoints: n,
                        childrenBitField: c,
                        children: [],
                        name: childname,
                        baseurl: url,
                        bbox: bounds,
                        layer,
                        parent: snode,
                    };
                    snode.children.push(item);
                    stack.push(item);
                }
            }
        }

        return root;
    });
}

function findChildrenByName(node, name) {
    if (node.name === name) {
        return node;
    }
    const charIndex = node.name.length;
    for (let i = 0; i < node.children.length; i++) {
        if (node.children[i].name[charIndex] == name[charIndex]) {
            return findChildrenByName(node.children[i], name);
        }
    }
    throw new Error(`Cannot find node with name '${name}'`);
}

function computeBbox(layer) {
    let bbox;
    if (layer.isFromPotreeConverter) {
        bbox = new THREE.Box3(
                new THREE.Vector3(layer.metadata.boundingBox.lx, layer.metadata.boundingBox.ly, layer.metadata.boundingBox.lz),
                new THREE.Vector3(layer.metadata.boundingBox.ux, layer.metadata.boundingBox.uy, layer.metadata.boundingBox.uz));
    } else {
        // lopocs
        let idx = 0;
        for (const entry of layer.metadata) {
            if (entry.table == layer.table) {
                break;
            }
            idx++;
        }
        bbox = new THREE.Box3(
                new THREE.Vector3(layer.metadata[idx].bbox.xmin, layer.metadata[idx].bbox.ymin, layer.metadata[idx].bbox.zmin),
                new THREE.Vector3(layer.metadata[idx].bbox.xmax, layer.metadata[idx].bbox.ymax, layer.metadata[idx].bbox.zmax));
    }
    return bbox;
}

function parseMetadata(metadata, layer) {
    layer.metadata = metadata;

    var customBinFormat = true;

    // Lopocs pointcloud server can expose the same file structure as PotreeConverter output.
    // The only difference is the metadata root file (cloud.js vs infos/sources), and we can
    // check for the existence of a `scale` field.
    // (if `scale` is defined => we're fetching files from PotreeConverter)
    if (layer.metadata.scale != undefined) {
        layer.isFromPotreeConverter = true;
        // PotreeConverter format
        customBinFormat = layer.metadata.pointAttributes === 'CIN';
        // do we have normal information
        const normal = Array.isArray(layer.metadata.pointAttributes) &&
            layer.metadata.pointAttributes.find(elem => elem.startsWith('NORMAL'));
        if (normal) {
            layer.material.defines[normal] = 1;
        }
    } else {
        // Lopocs
        layer.metadata.scale = 1;
        layer.metadata.octreeDir = `itowns/${layer.table}.points`;
        layer.metadata.hierarchyStepSize = 1000000; // ignore this with lopocs
        customBinFormat = true;
    }

    layer.parse = customBinFormat ? PotreeCinParser.parse : PotreeBinParser.parse;
    layer.extension = customBinFormat ? 'cin' : 'bin';
    layer.supportsProgressiveDisplay = customBinFormat;
}

export function getObjectToUpdateForAttachedLayers(meta) {
    if (meta.obj) {
        const p = meta.parent;
        if (p && p.obj) {
            return {
                element: meta.obj,
                parent: p.obj,
            };
        } else {
            return {
                element: meta.obj,
            };
        }
    }
}

export default {
    preprocessDataLayer(layer, view) {
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
            layer.bboxes.visible = false;
        }

        // default options
        layer.fetchOptions = layer.fetchOptions || {};
        layer.octreeDepthLimit = layer.octreeDepthLimit || -1;
        layer.pointBudget = layer.pointBudget || 2000000;
        layer.pointSize = layer.pointSize === 0 || !isNaN(layer.pointSize) ? layer.pointSize : 4;
        layer.sseThreshold = layer.sseThreshold || 2;
        layer.material = layer.material || {};
        layer.material = layer.material.isMaterial ? layer.material : new PointsMaterial(layer.material);
        layer.material.defines = layer.material.defines || {};
        layer.mode = MODE.COLOR;

        // default update methods
        layer.preUpdate = PointCloudProcessing.preUpdate;
        layer.update = PointCloudProcessing.update;
        layer.postUpdate = PointCloudProcessing.postUpdate;

        // override the default method, since updated objects are metadata in this case
        layer.getObjectToUpdateForAttachedLayers = getObjectToUpdateForAttachedLayers;

        // this probably needs to be moved to somewhere else
        layer.pickObjectsAt = (view, mouse, radius) => Picking.pickPointsAt(view, mouse, radius, layer);

        return Fetcher.json(`${layer.url}/${layer.file}`, layer.fetchOptions)
            .then((metadata) => {
                parseMetadata(metadata, layer);
                const bbox = computeBbox(layer);
                return parseOctree(layer, layer.metadata.hierarchyStepSize, { baseurl: `${layer.url}/${layer.metadata.octreeDir}/r`, name: '', bbox });
            })
            .then((root) => {
                // eslint-disable-next-line no-console
                console.log('LAYER metadata:', root);
                layer.root = root;
                root.findChildrenByName = findChildrenByName.bind(root, root);
                layer.extent = Extent.fromBox3(view.referenceCrs, root.bbox);

                return layer;
            });
    },

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
            if (points.material.enablePicking) {
                Picking.preparePointGeometryForPicking(points.geometry);
            }
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

export const _testing = {
    parseMetadata,
};
