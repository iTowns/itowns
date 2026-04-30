import PointCloudNode from 'Core/PointCloudNode';
import type { PotreeNodeHierarchy } from 'Core/PotreeNode';
import type { Potree2NodeHierarchy } from 'Core/Potree2Node';

export abstract class PotreeNodeBase extends PointCloudNode {
    /** X position within the octree */
    x: number;
    /** Y position within the octree */
    y: number;
    /** Z position within the octree */
    z: number;

    crs: string;

    abstract override url: string;

    // for potree1&2
    abstract childrenBitField: number;

    constructor(
        depth: number,
        x: number, y: number, z: number,
        numPoints: number,
        crs: string,
    ) {
        super(depth, numPoints);

        this.x = x;
        this.y = y;
        this.z = z;

        this.crs = crs;
    }

    abstract override get networkOptions(): RequestInit;
    abstract override loadHierarchy(): Promise<
        Record<string, PotreeNodeHierarchy> | Record<string, Potree2NodeHierarchy>
    >;
    abstract override findAndCreateChild(depth: number, x: number, y: number, z: number): void;

    override fetcher(url: string, networkOptions = this.networkOptions): Promise<ArrayBuffer> {
        return this.source.fetcher(url, networkOptions);
    }
}

export default PotreeNodeBase;
