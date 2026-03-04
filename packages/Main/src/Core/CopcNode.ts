import { Hierarchy } from 'copc';
import LasNodeBase, { buildVoxelKey } from 'Core/LasNodeBase';
import type CopcSource from 'Source/CopcSource';

class CopcNode extends LasNodeBase {
    /**  Used to checkout whether this
     * node is a CopcNode. Default is `true`. You should not change
     * this, as it is used internally for optimisation. */
    readonly isCopcNode: true;

    source: CopcSource;

    url: string;

    hierarchy: Hierarchy.Subtree;

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
     * @param numPoints - Number of points of the node.
     * Set to -1 when we don't have the information yet.
     * @param crs - The crs of the node.
     */
    constructor(
        depth: number,
        x: number, y: number, z: number,
        entryOffset: number,
        entryLength: number,
        source: CopcSource,
        numPoints: number,
        crs: string,
    ) {
        super(depth, x, y, z, source, numPoints, crs);
        this.isCopcNode = true;
        this.source = source;

        this.url = this.source.url;

        this.hierarchy = {
            nodes: {},
            pages: {},
        };

        this.entryOffset = entryOffset;
        this.entryLength = entryLength;
    }

    override fetcher(url: string, networkOptions: RequestInit): Promise<ArrayBuffer> {
        return this.source.fetcher(url, {
            ...networkOptions,
            headers: {
                ...networkOptions.headers,
                range: `bytes=${this.entryOffset}-${this.entryOffset + this.entryLength - 1}`,
            },
        });
    }

    async loadHierarchy(): Promise<Hierarchy.Subtree> {
        if (this.hierarchyIsLoaded) {
            return this.hierarchy;
        }
        const buffer = await this.fetcher(this.source.url, this.networkOptions);
        this.hierarchy = await Hierarchy.parse(new Uint8Array(buffer));

        // Update current node entry from newly loaded subtree
        const node = this.hierarchy.nodes[this.voxelKey];
        if (!node) {
            return Promise.reject('[CopcNode]: Ill-formed data, entry not found in hierarchy.');
        }
        this.numPoints = node.pointCount;
        this.entryOffset = node.pointDataOffset;
        this.entryLength = node.pointDataLength;

        return this.hierarchy;
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
        depth: number, x: number, y: number, z: number,
    ): void {
        const childVoxelKey = buildVoxelKey(depth, x, y, z);

        let offset: number;
        let byteSize: number;
        let numPoints: number;

        const node = this.hierarchy.nodes[childVoxelKey];
        if (node) {
            offset = node.pointDataOffset;
            byteSize = node.pointDataLength;
            numPoints = node.pointCount;
        } else {
            const page = this.hierarchy.pages[childVoxelKey];
            if (!page) { return; }
            offset = page.pageOffset;
            byteSize = page.pageLength;
            numPoints = -1;
        }

        const child = new CopcNode(
            depth, x, y, z,
            offset,
            byteSize,
            this.source,
            numPoints,
            this.crs,
        );
        child.hierarchy = this.hierarchy;
        this.add(child as this, 0);
    }
}

export default CopcNode;
