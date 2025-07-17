import * as THREE from 'three';
import PointCloudNode from 'Core/PointCloudNode';

// Create an A(xis)A(ligned)B(ounding)B(ox) for the child `childIndex` of one aabb.
// (PotreeConverter protocol builds implicit octree hierarchy by applying the same
// subdivision algo recursively)
const dHalfLength = new THREE.Vector3();

class PotreeNode extends PointCloudNode {
    constructor(numPoints = 0, childrenBitField = 0, layer) {
        super(numPoints, layer);
        this.childrenBitField = childrenBitField;

        this.depth = 0;

        this.hierarchyKey = 'r';

        this.baseurl = layer.source.baseurl;
    }

    get octreeIsLoaded() {
        return !(this.childrenBitField && this.children.length === 0);
    }

    get url() {
        return `${this.baseurl}/${this.hierarchyKey}.${this.layer.source.extension}`;
    }

    get id() {
        return this.hierarchyKey;
    }

    add(node, indexChild) {
        node.hierarchyKey = this.hierarchyKey + indexChild;
        node.depth = this.depth + 1;
        super.add(node, indexChild);
    }

    createChildAABB(node, childIndex) {
        // Code inspired from potree
        node.bbox.copy(this.bbox);
        this.bbox.getCenter(node.bbox.max);
        dHalfLength.copy(node.bbox.max).sub(this.bbox.min);

        if (childIndex === 1) {
            node.bbox.min.z += dHalfLength.z;
            node.bbox.max.z += dHalfLength.z;
        } else if (childIndex === 3) {
            node.bbox.min.z += dHalfLength.z;
            node.bbox.max.z += dHalfLength.z;
            node.bbox.min.y += dHalfLength.y;
            node.bbox.max.y += dHalfLength.y;
        } else if (childIndex === 0) {
            //
        } else if (childIndex === 2) {
            node.bbox.min.y += dHalfLength.y;
            node.bbox.max.y += dHalfLength.y;
        } else if (childIndex === 5) {
            node.bbox.min.z += dHalfLength.z;
            node.bbox.max.z += dHalfLength.z;
            node.bbox.min.x += dHalfLength.x;
            node.bbox.max.x += dHalfLength.x;
        } else if (childIndex === 7) {
            node.bbox.min.add(dHalfLength);
            node.bbox.max.add(dHalfLength);
        } else if (childIndex === 4) {
            node.bbox.min.x += dHalfLength.x;
            node.bbox.max.x += dHalfLength.x;
        } else if (childIndex === 6) {
            node.bbox.min.y += dHalfLength.y;
            node.bbox.max.y += dHalfLength.y;
            node.bbox.min.x += dHalfLength.x;
            node.bbox.max.x += dHalfLength.x;
        }
    }

    load() {
        // Query octree/HRC if we don't have children potreeNode yet.
        if (!this.octreeIsLoaded) {
            this.loadOctree();
        }
        return super.load();
    }

    loadOctree() {
        const octreeUrl = `${this.baseurl}/${this.hierarchyKey}.${this.layer.source.extensionOctree}`;
        return this.layer.source.fetcher(octreeUrl, this.layer.source.networkOptions).then((blob) => {
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
                        const child = new PotreeNode(numPoints, childrenBitField, this.layer);
                        snode.add(child, indexChild);
                        if ((child.id.length % this.layer.hierarchyStepSize) == 0) {
                            child.baseurl = `${this.baseurl}/${child.id}`;
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
