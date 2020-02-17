import * as THREE from 'three';

// Create an A(xis)A(ligned)B(ounding)B(ox) for the child `childIndex` of one aabb.
// (PotreeConverter protocol builds implicit octree hierarchy by applying the same
// subdivision algo recursively)
const dHalfLength = new THREE.Vector3();

class PointCloudNode {
    constructor(numPoints = 0, childrenBitField = 0, layer) {
        this.numPoints = numPoints;
        this.childrenBitField = childrenBitField;
        this.children = [];
        this.layer = layer;
        this.name = '';
        this.bbox = new THREE.Box3();
        this.sse = -1;
        this.baseurl = layer.source.baseurl;
    }

    add(node, indexChild, root) {
        this.children.push(node);
        node.parent = this;
        node.name = this.name + indexChild;
        this.createChildAABB(indexChild, node.bbox);
        if ((node.name.length % this.layer.hierarchyStepSize) == 0) {
            node.baseurl = `${root.baseurl}/${node.name.substr(root.name.length)}`;
        } else {
            node.baseurl = root.baseurl;
        }
    }

    createChildAABB(childIndex, box) {
        // Code inspired from potree
        box.copy(this.bbox);
        this.bbox.getCenter(box.max);
        dHalfLength.copy(box.max).sub(this.bbox.min);

        if (childIndex === 1) {
            box.min.z += dHalfLength.z;
            box.max.z += dHalfLength.z;
        } else if (childIndex === 3) {
            box.min.z += dHalfLength.z;
            box.max.z += dHalfLength.z;
            box.min.y += dHalfLength.y;
            box.max.y += dHalfLength.y;
        } else if (childIndex === 0) {
            //
        } else if (childIndex === 2) {
            box.min.y += dHalfLength.y;
            box.max.y += dHalfLength.y;
        } else if (childIndex === 5) {
            box.min.z += dHalfLength.z;
            box.max.z += dHalfLength.z;
            box.min.x += dHalfLength.x;
            box.max.x += dHalfLength.x;
        } else if (childIndex === 7) {
            box.min.add(dHalfLength);
            box.max.add(dHalfLength);
        } else if (childIndex === 4) {
            box.min.x += dHalfLength.x;
            box.max.x += dHalfLength.x;
        } else if (childIndex === 6) {
            box.min.y += dHalfLength.y;
            box.max.y += dHalfLength.y;
            box.min.x += dHalfLength.x;
            box.max.x += dHalfLength.x;
        }
    }

    getChildByName(name) {
        if (this.name === name) {
            return this;
        }
        const charIndex = this.name.length;
        for (const child of this.children) {
            if (child.name[charIndex] == name[charIndex]) {
                return child.getChildByName(name);
            }
        }
        throw new Error(`Cannot find node with name '${name}'`);
    }

    get octreeIsLoaded() {
        return !(this.childrenBitField && this.children.length === 0);
    }

    loadNode() {
        const nodeUrl = `${this.baseurl}/r${this.name}.${this.layer.source.extension}`;
        return this.layer.source.fetcher(nodeUrl, this.layer.source.networkOptions).then(this.layer.source.parse);
    }

    loadOctree() {
        const octreeUrl = `${this.baseurl}/r${this.name}.${this.layer.source.extensionOctree}`;
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
                        const item = new PointCloudNode(numPoints, childrenBitField, this.layer);
                        snode.add(item, indexChild, this);
                        stack.push(item);
                    }
                }
            }
        });
    }
}

export default PointCloudNode;
