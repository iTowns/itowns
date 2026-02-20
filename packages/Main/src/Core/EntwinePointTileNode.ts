import type EntwinePointTileSource from 'Source/EntwinePointTileSource';
import Fetcher from 'Provider/Fetcher';
import LasNodeBase, { buildVoxelKey } from 'Core/LasNodeBase';

class EntwinePointTileNode extends LasNodeBase {
    /** Used to checkout whether this
    * node is a EntwinePointTileNode. Default is `true`. You should not change
    * this, as it is used internally for optimisation. */
    readonly isEntwinePointTileNode: true;

    source: EntwinePointTileSource;

    url: string;

    hierarchy: Record<string, number>;

    /** The string id of the node, constituted of the four
    * components: `depth-x-y-z`. */
    voxelKey: string;

    /**
     * Constructs a new instance of EntwinePointTileNode.
     *
     * @param depth - The depth of the node in the tree - see the
     * [Entwine documentation](https://entwine.io/entwine-point-tile.html#ept-data)
     * @param x - The x coordinate of the node in the tree - see the
     * [Entwine documentation](https://entwine.io/entwine-point-tile.html#ept-data)
     * @param y - The y coordinate of the node in the tree - see the
     * [Entwine documentation](https://entwine.io/entwine-point-tile.html#ept-data)
     * @param z - The z coordinate of the node in the tree - see the
     * [Entwine documentation](https://entwine.io/entwine-point-tile.html#ept-data)
     * @param source - Data source (Ept) of the node.
     * @param numPoints - The number of points in this node. If
     * `-1`, it means that the octree hierarchy associated to this node needs to
     * be loaded.
     * @param crs - The crs of the node.
     */
    constructor(
        depth: number,
        x: number, y: number, z: number,
        source: EntwinePointTileSource,
        crs: string,
        hierarchy: Record<string, number> = {},
    ) {
        const voxelKey = buildVoxelKey(depth, x, y, z);
        const numPoints = hierarchy[voxelKey];
        super(depth, x, y, z, numPoints, crs);
        this.isEntwinePointTileNode = true;
        this.source = source;

        this.voxelKey = voxelKey;

        this.url = `${this.source.url}/ept-data/${this.voxelKey}.${this.source.extension}`;
        this.hierarchy = hierarchy;
    }

    override fetcher(url: string, networkOptions: RequestInit): Promise<ArrayBuffer> {
        return this.source.fetcher(url, networkOptions);
    }

    async loadHierarchy(): Promise<Record<string, number>> {
        if (this.hierarchyIsLoaded) { return this.hierarchy; }

        const hierarchyUrl = `${this.source.url}/ept-hierarchy/${this.voxelKey}.json`;
        this.hierarchy =
            await Fetcher.json(hierarchyUrl, this.networkOptions) as Record<string, number>;

        // update current node from the newly fetched hierarchy
        this.numPoints = this.hierarchy[this.voxelKey];

        return this.hierarchy;
    }

    override findAndCreateChild(
        depth: number, x: number, y: number, z: number,
    ): void {
        const childVoxelKey = buildVoxelKey(depth, x, y, z);

        if (!this.hierarchy[childVoxelKey]) { return; }

        const child = new EntwinePointTileNode(
            depth, x, y, z,
            this.source,
            this.crs,
            this.hierarchy,
        );

        this.add(child as this, 0);
    }
}

export default EntwinePointTileNode;
