import * as THREE from 'three';

const size = new THREE.Vector3();
const position = new THREE.Vector3();
const translation = new THREE.Vector3();

/**
 * @property {number} numPoints - The number of points in this node.
 * @property {PointCloudSource} source - Data source of the node.
 * @property {PointCloudNode[]} children - The children nodes of this node.
 * @property {THREE.Box3} bbox - The bounding box of the node.
 */
class PointCloudNode extends THREE.EventDispatcher {
    constructor(numPoints = 0, source) {
        super();

        this.numPoints = numPoints;

        this.source = source;

        this.children = [];
        this.bbox = new THREE.Box3();
        this.sse = -1;
    }

    get pointSpacing() {
        return this.source.spacing / 2 ** this.depth;
    }

    get id() {
        throw new Error('In extended PointCloudNode, you have to implement the getter id!');
    }

    add(node, indexChild) {
        this.children.push(node);
        node.parent = this;
        this.createChildAABB(node, indexChild);
    }

    createChildAABB(node) {
        // factor to apply, based on the depth difference (can be > 1)
        const f = 2 ** (node.depth - this.depth);

        // size of the child node bbox (Vector3), based on the size of the
        // parent node, and divided by the factor
        this.bbox.getSize(size).divideScalar(f);

        // initialize the child node bbox at the location of the parent node bbox
        node.bbox.min.copy(this.bbox.min);

        // position of the parent node, if it was at the same depth than the
        // child, found by multiplying the tree position by the factor
        position.copy(this).multiplyScalar(f);

        // difference in position between the two nodes, at child depth, and
        // scale it using the size
        translation.subVectors(node, position).multiply(size);

        // apply the translation to the child node bbox
        node.bbox.min.add(translation);

        // use the size computed above to set the max
        node.bbox.max.copy(node.bbox.min).add(size);
    }

    load() {
        return this.source.fetcher(this.url, this.source.networkOptions)
            .then(file => this.source.parse(file, {
                in: this.source,
            }));
    }

    findCommonAncestor(node) {
        if (node.depth == this.depth) {
            if (node.id == this.id) {
                return node;
            } else if (node.depth != 0) {
                return this.parent.findCommonAncestor(node.parent);
            }
        } else if (node.depth < this.depth) {
            return this.parent.findCommonAncestor(node);
        } else {
            return this.findCommonAncestor(node.parent);
        }
    }
}

export default PointCloudNode;
