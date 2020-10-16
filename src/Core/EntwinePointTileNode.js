import * as THREE from 'three';
import Fetcher from 'Provider/Fetcher';
import PointCloudNode from 'Core/PointCloudNode';

const size = new THREE.Vector3();
const position = new THREE.Vector3();
const translation = new THREE.Vector3();

function buildId(depth, x, y, z) {
    return `${depth}-${x}-${y}-${z}`;
}

/**
 * @extends PointCloudNode
 *
 * @property {boolean} isEntwinePointTileNode - Used to checkout whether this
 * node is a EntwinePointTileNode. Default is `true`. You should not change
 * this, as it is used internally for optimisation.
 * @property {number} depth - The depth of the node in the tree - see the
 * [Entwine
 * documentation](https://entwine.io/entwine-point-tile.html#ept-data)
 * @property {number} x - The x coordinate of the node in the tree - see the
 * [Entwine
 * documentation](https://entwine.io/entwine-point-tile.html#ept-data)
 * @property {number} y - The x coordinate of the node in the tree - see the
 * [Entwine
 * documentation](https://entwine.io/entwine-point-tile.html#ept-data)
 * @property {number} z - The x coordinate of the node in the tree - see the
 * [Entwine
 * documentation](https://entwine.io/entwine-point-tile.html#ept-data)
 * @property {string} id - The id of the node, constituted of the four
 * components: `depth-x-y-z`.
 */
class EntwinePointTileNode extends PointCloudNode {
    /**
     * Constructs a new instance of EntwinePointTileNode.
     *
     * @constructor
     *
     * @param {number} depth - The depth of the node in the tree - see the
     * [Entwine
     * documentation](https://entwine.io/entwine-point-tile.html#ept-data)
     * @param {number} x - The x coordinate of the node in the tree - see the
     * [Entwine
     * documentation](https://entwine.io/entwine-point-tile.html#ept-data)
     * @param {number} y - The x coordinate of the node in the tree - see the
     * [Entwine
     * documentation](https://entwine.io/entwine-point-tile.html#ept-data)
     * @param {number} z - The x coordinate of the node in the tree - see the
     * [Entwine
     * documentation](https://entwine.io/entwine-point-tile.html#ept-data)
     * @param {EntwinePointTileLayer} layer - The layer the node is attached to.
     * @param {number} [numPoints=0] - The number of points in this node. If
     * `-1`, it means that the octree hierarchy associated to this node needs to
     * be loaded.
     */
    constructor(depth, x, y, z, layer, numPoints = 0) {
        super(numPoints, layer);

        this.isEntwinePointTileNode = true;

        this.depth = depth;
        this.x = x;
        this.y = y;
        this.z = z;

        this.id = buildId(depth, x, y, z);

        this.url = `${this.layer.source.url}/ept-data/${this.id}.${this.layer.source.extension}`;
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

    get octreeIsLoaded() {
        return this.numPoints >= 0;
    }

    loadOctree() {
        return Fetcher.json(`${this.layer.source.url}/ept-hierarchy/${this.id}.json`, this.layer.source.networkOptions).then((hierarchy) => {
            this.numPoints = hierarchy[this.id];

            const stack = [];
            stack.push(this);

            while (stack.length) {
                const node = stack.shift();
                const depth = node.depth + 1;
                const x = node.x * 2;
                const y = node.y * 2;
                const z = node.z * 2;

                node.findAndCreateChild(depth, x,     y,     z,     hierarchy, stack);
                node.findAndCreateChild(depth, x + 1, y,     z,     hierarchy, stack);
                node.findAndCreateChild(depth, x,     y + 1, z,     hierarchy, stack);
                node.findAndCreateChild(depth, x + 1, y + 1, z,     hierarchy, stack);
                node.findAndCreateChild(depth, x,     y,     z + 1, hierarchy, stack);
                node.findAndCreateChild(depth, x + 1, y,     z + 1, hierarchy, stack);
                node.findAndCreateChild(depth, x,     y + 1, z + 1, hierarchy, stack);
                node.findAndCreateChild(depth, x + 1, y + 1, z + 1, hierarchy, stack);
            }
        });
    }

    findAndCreateChild(depth, x, y, z, hierarchy, stack) {
        const id = buildId(depth, x, y, z);
        const numPoints = hierarchy[id];

        if (typeof numPoints == 'number') {
            const child = new EntwinePointTileNode(depth, x, y, z, this.layer, numPoints);
            this.add(child);
            stack.push(child);
        }
    }
}

export default EntwinePointTileNode;
