import * as THREE from 'three';

const size = new THREE.Vector3();
const position = new THREE.Vector3();
const translation = new THREE.Vector3();

class PointCloudNode extends THREE.EventDispatcher {
    constructor(numPoints = 0, layer) {
        super();

        this.numPoints = numPoints;
        this.layer = layer;

        this.children = [];
        this.bbox = new THREE.Box3();
        this.sse = -1;
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
        // Query octree/HRC if we don't have children potreeNode yet.
        if (!this.octreeIsLoaded) {
            this.loadOctree();
        }

        return this.layer.source.fetcher(this.url, this.layer.source.networkOptions)
            .then(file => this.layer.source.parse(file, { out: this.layer, in: this.layer.source }));
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
