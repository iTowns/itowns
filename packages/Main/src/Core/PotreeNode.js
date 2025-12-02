import * as THREE from 'three';
import PointCloudNode from 'Core/PointCloudNode';

const dHalfLength = new THREE.Vector3();
const dHalfLength2 = new THREE.Vector3();

class PotreeNode extends PointCloudNode {
    constructor(depth, index, numPoints = 0, childrenBitField = 0, source, crs) {
        super(depth, numPoints, source);
        this.childrenBitField = childrenBitField;

        this.index = index;

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

    get hierarchyKey() {
        if (this._hierarchyKey != undefined) { return this._hierarchyKey; }
        if (this.depth === 0) {
            this._hierarchyKey = 'r';
        } else {
            this._hierarchyKey = this.parent.hierarchyKey + this.index;
        }
        return this._hierarchyKey;
    }

    setVoxelOBBFromParent() {
        // for potree the voxelOBB.natBox is updated as well
        this._voxelOBB.copy(this.parent.voxelOBB);

        // Code inspired from potree
        // (PotreeConverter protocol builds implicit octree hierarchy by applying the same
        // subdivision algo recursively)
        const voxelBBox = this._voxelOBB.box3D;
        voxelBBox.getCenter(voxelBBox.max);
        dHalfLength.copy(voxelBBox.max).sub(voxelBBox.min);

        const voxelNatbox = this._voxelOBB.natBox;
        voxelNatbox.getCenter(voxelNatbox.max);
        dHalfLength2.copy(voxelNatbox.max).sub(voxelNatbox.min);

        const childIndex = this.index;
        if (childIndex === 1) {
            voxelBBox.min.z += dHalfLength.z;
            voxelBBox.max.z += dHalfLength.z;

            voxelNatbox.min.z += dHalfLength.z;
            voxelNatbox.max.z += dHalfLength.z;
        } else if (childIndex === 3) {
            voxelBBox.min.z += dHalfLength.z;
            voxelBBox.max.z += dHalfLength.z;
            voxelBBox.min.y += dHalfLength.y;
            voxelBBox.max.y += dHalfLength.y;

            voxelNatbox.min.z += dHalfLength.z;
            voxelNatbox.max.z += dHalfLength.z;
            voxelNatbox.min.y += dHalfLength.y;
            voxelNatbox.max.y += dHalfLength.y;
        } else if (childIndex === 0) {
            //
        } else if (childIndex === 2) {
            voxelBBox.min.y += dHalfLength.y;
            voxelBBox.max.y += dHalfLength.y;

            voxelNatbox.min.y += dHalfLength.y;
            voxelNatbox.max.y += dHalfLength.y;
        } else if (childIndex === 5) {
            voxelBBox.min.z += dHalfLength.z;
            voxelBBox.max.z += dHalfLength.z;
            voxelBBox.min.x += dHalfLength.x;
            voxelBBox.max.x += dHalfLength.x;

            voxelNatbox.min.z += dHalfLength.z;
            voxelNatbox.max.z += dHalfLength.z;
            voxelNatbox.min.x += dHalfLength.x;
            voxelNatbox.max.x += dHalfLength.x;
        } else if (childIndex === 7) {
            voxelBBox.min.add(dHalfLength);
            voxelBBox.max.add(dHalfLength);

            voxelNatbox.min.add(dHalfLength);
            voxelNatbox.max.add(dHalfLength);
        } else if (childIndex === 4) {
            voxelBBox.min.x += dHalfLength.x;
            voxelBBox.max.x += dHalfLength.x;

            voxelNatbox.min.x += dHalfLength.x;
            voxelNatbox.max.x += dHalfLength.x;
        } else if (childIndex === 6) {
            voxelBBox.min.y += dHalfLength.y;
            voxelBBox.max.y += dHalfLength.y;
            voxelBBox.min.x += dHalfLength.x;
            voxelBBox.max.x += dHalfLength.x;

            voxelNatbox.min.y += dHalfLength.y;
            voxelNatbox.max.y += dHalfLength.y;
            voxelNatbox.min.x += dHalfLength.x;
            voxelNatbox.max.x += dHalfLength.x;
        }
    }

    load() {
        return super.load();
    }

    loadOctree() {
        const octreeUrl = `${this.baseurl}/${this.hierarchyKey}.${this.source.extensionOctree}`;
        return this.source.fetcher(octreeUrl, this.source.networkOptions)
            .then((blob) => {
                const view = new DataView(blob);
                const stack = [];
                let offset = 0;

                this.childrenBitField = view.getUint8(0); offset += 1;
                this.numPoints = view.getUint32(1, true); offset += 4;

                stack.push(this);

                while (stack.length && offset < blob.byteLength) {
                    const snode = stack.shift();
                    // look up 8 children
                    for (let indexChild = 0; indexChild < 8; indexChild++) {
                        // does snode have a #indexChild child ?
                        if (snode.childrenBitField & (1 << indexChild) && (offset + 5) <= blob.byteLength) {
                            const childrenBitField = view.getUint8(offset); offset += 1;
                            const numPoints = view.getUint32(offset, true) || this.numPoints; offset += 4;
                            const child = new PotreeNode(snode.depth + 1, indexChild, numPoints, childrenBitField, this.source, this.crs);
                            snode.add(child);
                            if ((child.depth % this.source.hierarchyStepSize) == 0) {
                                child.baseurl = `${this.baseurl}/${child.hierarchyKey.substring(1)}`;
                            } else {
                                child.baseurl = this.baseurl;
                            }
                            stack.push(child);
                        }
                    }
                }
            });
    }
}

export default PotreeNode;
