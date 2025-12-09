import * as THREE from 'three';
import PointCloudNode from 'Core/PointCloudNode';
import type PotreeSource from 'Source/PotreeSource';

// Create an A(xis)A(ligned)B(ounding)B(ox) for the child `childIndex` of one aabb.
// (PotreeConverter protocol builds implicit octree hierarchy by applying the same
// subdivision algo recursively)
const dHalfLength = new THREE.Vector3();

export function computeChildBBox(voxelBBox: THREE.Box3, childIndex: number) {
    // Code inspired from potree
    const childVoxelBBox = voxelBBox.clone();
    voxelBBox.getCenter(childVoxelBBox.max);
    dHalfLength.copy(childVoxelBBox.max).sub(voxelBBox.min);

    if (childIndex === 1) {
        childVoxelBBox.min.z += dHalfLength.z;
        childVoxelBBox.max.z += dHalfLength.z;
    } else if (childIndex === 3) {
        childVoxelBBox.min.z += dHalfLength.z;
        childVoxelBBox.max.z += dHalfLength.z;
        childVoxelBBox.min.y += dHalfLength.y;
        childVoxelBBox.max.y += dHalfLength.y;
    } else if (childIndex === 0) {
        //
    } else if (childIndex === 2) {
        childVoxelBBox.min.y += dHalfLength.y;
        childVoxelBBox.max.y += dHalfLength.y;
    } else if (childIndex === 5) {
        childVoxelBBox.min.z += dHalfLength.z;
        childVoxelBBox.max.z += dHalfLength.z;
        childVoxelBBox.min.x += dHalfLength.x;
        childVoxelBBox.max.x += dHalfLength.x;
    } else if (childIndex === 7) {
        childVoxelBBox.min.add(dHalfLength);
        childVoxelBBox.max.add(dHalfLength);
    } else if (childIndex === 4) {
        childVoxelBBox.min.x += dHalfLength.x;
        childVoxelBBox.max.x += dHalfLength.x;
    } else if (childIndex === 6) {
        childVoxelBBox.min.y += dHalfLength.y;
        childVoxelBBox.max.y += dHalfLength.y;
        childVoxelBBox.min.x += dHalfLength.x;
        childVoxelBBox.max.x += dHalfLength.x;
    }

    return childVoxelBBox;
}

class PotreeNode extends PointCloudNode {
    source: PotreeSource;

    childrenBitField: number;
    hierarchyKey: string;
    baseurl: string;
    offsetBBox?: THREE.Box3;
    crs: string;
    constructor(numPoints = 0, childrenBitField = 0, source: PotreeSource, crs: string) {
        super(numPoints);
        this.source = source;

        this.childrenBitField = childrenBitField;

        this.depth = 0;

        this.hierarchyKey = 'r';

        this.baseurl = source.baseurl;

        this.crs = crs;
    }

    get octreeIsLoaded() {
        return !(this.childrenBitField && this.children.length === 0);
    }

    get url() {
        return `${this.baseurl}/${this.hierarchyKey}.${this.source.extension}`;
    }

    get id() {
        return this.hierarchyKey;
    }

    add(node: this, indexChild: number) {
        node.hierarchyKey = this.hierarchyKey + indexChild;
        node.depth = this.depth + 1;
        super.add(node, indexChild);
    }

    createChildAABB(childNode: PotreeNode, childIndex: number) {
        childNode.voxelOBB.copy(this.voxelOBB);
        childNode.voxelOBB.box3D = computeChildBBox(this.voxelOBB.box3D, childIndex);

        childNode.clampOBB.copy(childNode.voxelOBB);
        const childClampBBox = childNode.clampOBB.box3D;

        if (childClampBBox.min.z < this.source.zmax) {
            childClampBBox.max.z = Math.min(childClampBBox.max.z, this.source.zmax);
        }
        if (childClampBBox.max.z > this.source.zmin) {
            childClampBBox.min.z = Math.max(childClampBBox.min.z, this.source.zmin);
        }

        childNode.voxelOBB.matrixWorldInverse = this.voxelOBB.matrixWorldInverse;
        childNode.clampOBB.matrixWorldInverse = this.clampOBB.matrixWorldInverse;
    }

    async load(networkOptions = this.source.networkOptions) {
        // Query octree/HRC if we don't have children yet.
        if (!this.octreeIsLoaded) {
            await this.loadOctree();
        }

        const file = await this.source.fetcher(this.url, networkOptions);
        return this.source.parser(file, { in: this });
    }

    async loadOctree() {
        this.offsetBBox = new THREE.Box3().setFromArray(this.source.boundsConforming);// Only for Potree1
        const octreeUrl = `${this.baseurl}/${this.hierarchyKey}.${this.source.extensionOctree}`;
        const blob = await this.source.fetcher(octreeUrl, this.source.networkOptions);
        const view = new DataView(blob);
        const stack = [];
        let offset = 0;

        this.childrenBitField = view.getUint8(0); offset += 1;
        this.numPoints = view.getUint32(1, true); offset += 4;

        stack.push(this);

        while (stack.length && offset < blob.byteLength) {
            const snode = stack.shift() as PotreeNode;
            // look up 8 children
            for (let indexChild = 0; indexChild < 8; indexChild++) {
                // does snode have a #indexChild child ?
                if (snode.childrenBitField & (1 << indexChild) && (offset + 5) <= blob.byteLength) {
                    const childrenBitField = view.getUint8(offset); offset += 1;
                    const numPoints = view.getUint32(offset, true) || this.numPoints; offset += 4;
                    const child = new PotreeNode(numPoints, childrenBitField, this.source, this.crs);

                    snode.add(child, indexChild);
                    child.offsetBBox = computeChildBBox(child.parent!.offsetBBox!, indexChild);// For Potree1 Parser
                    if ((child.depth % this.source.hierarchyStepSize) == 0) {
                        child.baseurl = `${this.baseurl}/${child.hierarchyKey.substring(1)}`;
                    } else {
                        child.baseurl = this.baseurl;
                    }
                    stack.push(child);
                }
            }
        }
    }
}

export default PotreeNode;
