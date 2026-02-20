import { Hierarchy } from 'copc';
import LasNodeBase, { buildVoxelKey } from 'Core/LasNodeBase';
import type CopcSource from 'Source/CopcSource';

const defaultHierarchy: Hierarchy.Subtree = {
    nodes: {},
    pages: {},
};

class CopcNode extends LasNodeBase {
    /**  Used to checkout whether this
     * node is a CopcNode. Default is `true`. You should not change
     * this, as it is used internally for optimisation. */
    readonly isCopcNode: true;

    source: CopcSource;

    url: string;

    /** Octree's subtree */
    hierarchy: Hierarchy.Subtree;

    /** The string id of the node, constituted of the four
    * components: `depth-x-y-z`. */
    voxelKey: string;

    /** Offset from the beginning of the file of
     * the node entry */
    private entryOffset: number;
    /** Size of the node entry */
    private entryLength: number;

    /**
     * Constructs a new instance of a COPC Octree node
     *
     * @param depth - Depth within the octree.
     * @param x - X position within the octree.
     * @param y - Y position within the octree.
     * @param z - Z position with the octree.
     * @param source - Data source (COPC) of the node.
     * Set to -1 when we don't have the information yet.
     * @param crs - The crs of the node.
     */
    constructor(
        depth: number,
        x: number, y: number, z: number,
        source: CopcSource,
        crs: string,
        hierarchy: Hierarchy.Subtree = defaultHierarchy,
    ) {
        const voxelKey = buildVoxelKey(depth, x, y, z);
        const hNode = hierarchy.nodes[voxelKey];
        const numPoints = hNode?.pointCount ?? -1;
        super(depth, x, y, z, numPoints, crs);
        this.isCopcNode = true;
        this.source = source;

        this.voxelKey = voxelKey;

        this.url = this.source.url;
        this.hierarchy = hierarchy;

        // copc
        const hPage = this.hierarchy.pages[this.voxelKey] || this.source.info.rootHierarchyPage;
        this.entryOffset = hNode?.pointDataOffset ?? hPage.pageOffset;
        this.entryLength = hNode?.pointDataLength ?? hPage.pageLength;
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
        if (this.hierarchyIsLoaded) { return this.hierarchy; }

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
     */
    override findAndCreateChild(
        depth: number, x: number, y: number, z: number,
    ): void {
        const childVoxelKey = buildVoxelKey(depth, x, y, z);

        if (!(this.hierarchy.nodes[childVoxelKey] || this.hierarchy.pages[childVoxelKey])) {
            return;
        }

        const child = new CopcNode(
            depth, x, y, z,
            this.source,
            this.crs,
            this.hierarchy,
        );

        this.add(child as this, 0);
    }
}

export default CopcNode;
