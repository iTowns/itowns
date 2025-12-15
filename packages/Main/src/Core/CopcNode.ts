import { Hierarchy } from 'copc';
import LasNodeBase from 'Core/LasNodeBase';
import type CopcSource from 'Source/CopcSource';
import type { BufferGeometry } from 'three';

function buildVoxelKey(depth: number, x: number, y: number, z: number): string {
    return `${depth}-${x}-${y}-${z}`;
}

class CopcNode extends LasNodeBase {
    /**  Used to checkout whether this
     * node is a CopcNode. Default is `true`. You should not change
     * this, as it is used internally for optimisation. */
    readonly isCopcNode: true;

    source: CopcSource;

    crs: string;
    url: string;
    /** Offset from the beginning of the file of
     * the node entry */
    entryOffset: number;
    /** Size of the node entry */
    entryLength: number;
    /**
     * Constructs a new instance of a COPC Octree node
     *
     * @param depth - Depth within the octree.
     * @param x - X position within the octree.
     * @param y - Y position within the octree.
     * @param z - Z position with the octree.
     * @param entryOffset - Offset from the beginning of the file to
     * the node entry.
     * @param entryLength - Size of the node entry.
     * @param source - Data source (COPC) of the node.
     * @param numPoints - Number of points given by this entry.
     * @param crs - The crs of the node.
     */
    constructor(
        depth: number,
        x: number, y: number, z: number,
        entryOffset: number,
        entryLength: number,
        source: CopcSource,
        numPoints: number = 0,
        crs: string,
    ) {
        super(depth, x, y, z, source, numPoints, crs);
        this.isCopcNode = true;
        this.source = source;

        this.url = this.source.url;

        this.crs = crs;

        this.entryOffset = entryOffset;
        this.entryLength = entryLength;
    }

    /**
     * @param offset - offset of the entry to fetch.
     * @param size - size of the entry
     */
    private async _fetch(offset: number, size: number): Promise<ArrayBuffer> {
        return this.source.fetcher(this.source.url, {
            ...this.source.networkOptions,
            headers: {
                ...this.source.networkOptions.headers,
                range: `bytes=${offset}-${offset + size - 1}`,
            },
        });
    }

    override async loadOctree(): Promise<void> {
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
            const node = stack.shift() as CopcNode;
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
     * @param depth - Child node depth in the octree
     * @param x - Child node x position in the octree
     * @param y - Child node y position in the octree
     * @param z - Child node z position in the octree
     * @param hierarchy - Octree's subtree
     * @param stack - Stack of node candidates for traversal
     */
    override findAndCreateChild(
        depth: number,
        x: number, y: number, z: number,
        hierarchy: Hierarchy.Subtree,
        stack: CopcNode[],
    ): void {
        const voxelKey = buildVoxelKey(depth, x, y, z);

        let pointCount: number;
        let offset: number;
        let byteSize: number;

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
            x, y, z,
            offset,
            byteSize,
            this.source,
            pointCount,
            this.crs,
        );
        this.add(child as this, 0);
        stack.push(child);
    }

    /**
     * Load the COPC Buffer geometry for this node.
     */
    override async load(): Promise<BufferGeometry> {
        if (!this.octreeIsLoaded) {
            await this.loadOctree();
        }

        const buffer = await this._fetch(this.entryOffset, this.entryLength);
        const geometry = await this.source.parser(buffer, {
            in: this,
        });

        return geometry;
    }
}

export default CopcNode;
