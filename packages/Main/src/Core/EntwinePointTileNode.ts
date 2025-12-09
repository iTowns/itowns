import Fetcher from 'Provider/Fetcher';
import type EntwinePointTileSource from 'Source/EntwinePointTileSource';
import PointCloudNode from './PointCloudNode';

function buildVoxelKey(depth: number, x: number, y: number, z: number): string {
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
    readonly isEntwinePointTileNode: true;

    source: EntwinePointTileSource;

    voxelKey: string;
    crs: string;
    url: string;

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
     * @param {EntwinePointTileSource} source - Data source (Ept) of the node.
     * @param {number} [numPoints=0] - The number of points in this node. If
     * `-1`, it means that the octree hierarchy associated to this node needs to
     * be loaded.
     * @param {string} crs - The crs of the node.
     */
    constructor(depth: number, x: number, y: number, z: number, source: EntwinePointTileSource, numPoints: number = 0, crs: string) {
        super(numPoints);
        this.isEntwinePointTileNode = true;
        this.source = source;

        this.depth = depth;
        this.x = x;
        this.y = y;
        this.z = z;

        this.voxelKey = buildVoxelKey(depth, x, y, z);

        this.url = `${this.source.url}/ept-data/${this.voxelKey}.${this.source.extension}`;

        this.crs = crs;
    }

    get octreeIsLoaded() {
        return this.numPoints >= 0;
    }

    get id() {
        return `${this.depth}${this.x}${this.y}${this.z}`;
    }

    async loadOctree() {
        const hierarchyUrl = `${this.source.url}/ept-hierarchy/${this.voxelKey}.json`;
        const hierarchy = await Fetcher.json(hierarchyUrl, this.source.networkOptions) as Record<string, number>;
        this.numPoints = hierarchy[this.voxelKey];

        const stack = [];
        stack.push(this);

        while (stack.length) {
            const node = stack.shift() as EntwinePointTileNode;
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
    }

    async load(networkOptions = this.source.networkOptions) {
        if (!this.octreeIsLoaded) {
            await this.loadOctree();
        }

        const file = await this.source.fetcher(this.url, networkOptions);
        return this.source.parser(file, { in: this });
    }

    findAndCreateChild(depth: number, x: number, y: number, z: number, hierarchy: Record<string, number>, stack: EntwinePointTileNode[]) {
        const voxelKey = buildVoxelKey(depth, x, y, z);
        const numPoints = hierarchy[voxelKey];

        if (typeof numPoints == 'number') {
            const child = new EntwinePointTileNode(depth, x, y, z, this.source, numPoints, this.crs);
            this.add(child as this, 0);
            stack.push(child);
        }
    }
}

export default EntwinePointTileNode;
