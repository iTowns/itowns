import Fetcher from 'Provider/Fetcher';
import PointCloudNode from 'Core/PointCloudNode';

function buildVoxelKey(depth, x, y, z) {
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
 * @property {number} y - The y coordinate of the node in the tree - see the
 * [Entwine
 * documentation](https://entwine.io/entwine-point-tile.html#ept-data)
 * @property {number} z - The z coordinate of the node in the tree - see the
 * [Entwine
 * documentation](https://entwine.io/entwine-point-tile.html#ept-data)
 * @property {string} voxelKey - The id of the node, constituted of the four
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
     * @param {number} y - The y coordinate of the node in the tree - see the
     * [Entwine
     * documentation](https://entwine.io/entwine-point-tile.html#ept-data)
     * @param {number} z - The z coordinate of the node in the tree - see the
     * [Entwine
     * documentation](https://entwine.io/entwine-point-tile.html#ept-data)
     * @param {EntwinePointTileLayer} layer - The layer the node is attached to.
     * @param {number} [numPoints=0] - The number of points in this node. If
     * `-1`, it means that the octree hierarchy associated to this node needs to
     * be loaded.
     * @param {number} [sId] - id for multisource
     */
    constructor(depth, x, y, z, layer, numPoints = 0, sId = -1) {
        super(numPoints, layer);
        this.isEntwinePointTileNode = true;

        this.depth = depth;
        this.x = x;
        this.y = y;
        this.z = z;
        this.sId = sId;

        this.voxelKey = buildVoxelKey(depth, x, y, z);

        let sourceUrl = this.layer.source.url;
        let sourceExtension = this.layer.source.extension;
        if (this.layer.source.urls) {
            sourceUrl = this.layer.source.sources[this.sId].url;
            sourceExtension = this.layer.source.sources[this.sId].extension;
        }

        this.url = `${sourceUrl}/ept-data/${this.voxelKey}.${sourceExtension}`;
    }

    get octreeIsLoaded() {
        return this.numPoints >= 0;
    }

    get id() {
        return `${this.depth}${this.x}${this.y}${this.z}`;
    }

    loadOctree() {
        let sourceUrl = this.layer.source.url;
        if (this.layer.source.urls) {
            sourceUrl = this.layer.source.sources[this.sId].url;
        }
        const hierarchyUrl = `${sourceUrl}/ept-hierarchy/${this.voxelKey}.json`;
        return Fetcher.json(hierarchyUrl, this.layer.source.networkOptions).then((hierarchy) => {
            this.numPoints = hierarchy[this.voxelKey];

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
            return this;
        });
    }

    load() {
        let sourceFetcher = this.layer.source.fetcher;
        let sourceParse = this.layer.source.parse;
        let layerSource = this.layer.source;
        if (this.layer.source.urls) {
            sourceFetcher = this.layer.source.sources[this.sId].fetcher;
            sourceParse = this.layer.source.sources[this.sId].parse;
            layerSource = this.layer.source.sources[this.sId];
        }

        return sourceFetcher(this.url, this.layer.source.networkOptions)
            .then(file => sourceParse(file, { out: this.layer, in: layerSource }));
    }

    findAndCreateChild(depth, x, y, z, hierarchy, stack) {
        const voxelKey = buildVoxelKey(depth, x, y, z);
        const numPoints = hierarchy[voxelKey];

        if (typeof numPoints == 'number') {
            const child = new EntwinePointTileNode(depth, x, y, z, this.layer, numPoints, this.sId);
            this.add(child);
            stack.push(child);
        }
    }
}

export default EntwinePointTileNode;
