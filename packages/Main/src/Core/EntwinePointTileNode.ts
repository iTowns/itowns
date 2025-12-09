import type EntwinePointTileSource from 'Source/EntwinePointTileSource';
import type { BufferGeometry } from 'three';
import Fetcher from 'Provider/Fetcher';
import PointCloudNode from './PointCloudNode';

function buildVoxelKey(depth: number, x: number, y: number, z: number): string {
    return `${depth}-${x}-${y}-${z}`;
}

class EntwinePointTileNode extends PointCloudNode {
    /** Used to checkout whether this
    * node is a EntwinePointTileNode. Default is `true`. You should not change
    * this, as it is used internally for optimisation. */
    readonly isEntwinePointTileNode: true;

    source: EntwinePointTileSource;

    /** The id of the node, constituted of the four
     * components: `depth-x-y-z`. */
    voxelKey: string;
    crs: string;
    url: string;

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
        numPoints: number = 0,
        crs: string,
    ) {
        super(depth, numPoints);
        this.isEntwinePointTileNode = true;
        this.source = source;

        this.x = x;
        this.y = y;
        this.z = z;

        this.voxelKey = buildVoxelKey(depth, x, y, z);

        this.url = `${this.source.url}/ept-data/${this.voxelKey}.${this.source.extension}`;

        this.crs = crs;
    }

    override get octreeIsLoaded(): boolean {
        return this.numPoints >= 0;
    }

    override get id(): string {
        return `${this.depth}${this.x}${this.y}${this.z}`;
    }

    override async loadOctree(): Promise<void> {
        const hierarchyUrl = `${this.source.url}/ept-hierarchy/${this.voxelKey}.json`;
        const hierarchy =
        await Fetcher.json(hierarchyUrl, this.source.networkOptions) as Record<string, number>;
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

    override async load(networkOptions = this.source.networkOptions): Promise<BufferGeometry> {
        if (!this.octreeIsLoaded) {
            await this.loadOctree();
        }

        const file = await this.source.fetcher(this.url, networkOptions);
        return this.source.parser(file, { in: this });
    }

    findAndCreateChild(
        depth: number,
        x: number, y: number, z: number,
        hierarchy: Record<string, number>,
        stack: EntwinePointTileNode[],
    ): void {
        const voxelKey = buildVoxelKey(depth, x, y, z);
        const numPoints = hierarchy[voxelKey];

        if (typeof numPoints == 'number') {
            const child = new EntwinePointTileNode(
                depth, x, y, z,
                this.source, numPoints, this.crs);
            this.add(child as this, 0);
            stack.push(child);
        }
    }
}

export default EntwinePointTileNode;
