import { Hierarchy } from 'copc';
import PointCloudNode from 'Core/PointCloudNode';

function buildVoxelKey(depth, x, y, z) {
    return `${depth}-${x}-${y}-${z}`;
}

/**
 * @extends PointCloudNode
 *
 * @property {boolean} isCopcNode - Used to checkout whether this
 * node is a CopcNode. Default is `true`. You should not change
 * this, as it is used internally for optimisation.
 * @property {number} entryOffset - Offset from the beginning of the file of
 * the node entry
 * @property {number} entryLength - Size of the node entry
 * @property {number} depth - Depth within the octree
 * @property {number} x - X position within the octree
 * @property {number} y - Y position within the octree
 * @property {number} z - Z position within the octree
 * @property {string} voxelKey - The id of the node, constituted of the four
 * components: `depth-x-y-z`.
 */
class CopcNode extends PointCloudNode {
    /**
     * Constructs a new instance of a COPC Octree node
     *
     * @param {number} depth - Depth within the octree.
     * @param {number} x - X position within the octree.
     * @param {number} y - Y position within the octree.
     * @param {number} z - Z position with the octree.
     * @param {number} entryOffset - Offset from the beginning of the file to
     * the node entry.
     * @param {number} entryLength - Size of the node entry.
     * @param {CopcSource} source - Data source (COPC) of the node.
     * @param {number} [numPoints=0] - Number of points given by this entry.
     */
    constructor(depth, x, y, z, entryOffset, entryLength, source, numPoints = 0) {
        super(numPoints, source);
        this.isCopcNode = true;

        this.entryOffset = entryOffset;
        this.entryLength = entryLength;

        this.depth = depth;
        this.x = x;
        this.y = y;
        this.z = z;

        this.voxelKey = buildVoxelKey(depth, x, y, z);
    }

    get octreeIsLoaded() {
        return this.numPoints >= 0;
    }

    get id() {
        return `${this.depth}${this.x}${this.y}${this.z}`;
    }

    /**
     * @param {number} offset
     * @param {number} size
     */
    async _fetch(offset, size) {
        return this.source.fetcher(this.source.url, {
            ...this.source.networkOptions,
            headers: {
                ...this.source.networkOptions.headers,
                range: `bytes=${offset}-${offset + size - 1}`,
            },
        });
    }

    async loadOctree() {
        // Load hierarchy
        const buffer = await this._fetch(this.entryOffset, this.entryLength);
        const hierarchy = await Hierarchy.parse(new Uint8Array(buffer));

        // Update current node entry from loaded subtree
        const node = hierarchy.nodes[this.voxelKey];
        if (!node) {
            return Promise.reject('[CopcNode]: Ill-formed data, entry not found in hierarchy.');
        }
        this.numPoints = node.pointCount;
        this.entryOffset = node.pointDataOffset;
        this.entryLength = node.pointDataLength;

        // Load subtree entries
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
    }

    /**
     * Create a CopcNode from the provided subtree and add it as child
     * of the current node.
     * @param {number} depth - Child node depth in the octree
     * @param {number} x - Child node x position in the octree
     * @param {number} y - Child node y position in the octree
     * @param {number} z - Child node z position in the octree
     * @param {Hierarchy.Subtree} hierarchy - Octree's subtree
     * @param {CopcNode[]} stack - Stack of node candidates for traversal
     */
    findAndCreateChild(depth, x, y, z, hierarchy, stack) {
        const voxelKey = buildVoxelKey(depth, x, y, z);

        let pointCount;
        let offset;
        let byteSize;

        const node = hierarchy.nodes[voxelKey];
        if (node) {
            pointCount = node.pointCount;
            offset = node.pointDataOffset;
            byteSize = node.pointDataLength;
        } else {
            const page = hierarchy.pages[voxelKey];
            if (!page) { return; }
            pointCount = -1;
            offset = page.pageOffset;
            byteSize = page.pageLength;
        }

        const child = new CopcNode(
            depth,
            x,
            y,
            z,
            offset,
            byteSize,
            this.source,
            pointCount,
        );
        this.add(child);
        stack.push(child);
    }

    /**
     * Load the COPC Buffer geometry for this node.
     * @returns {Promise<THREE.BufferGeometry>}
     */
    async load() {
        if (!this.octreeIsLoaded) {
            await this.loadOctree();
        }

        const buffer = await this._fetch(this.entryOffset, this.entryLength);
        const geometry = await this.source.parser(buffer, {
            in: {
                ...this.source,
                pointCount: this.numPoints,
            },
        });

        return geometry;
    }
}

export default CopcNode;
