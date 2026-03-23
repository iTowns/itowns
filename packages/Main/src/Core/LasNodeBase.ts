import PointCloudNode from 'Core/PointCloudNode';
import type { Hierarchy } from 'copc';

abstract class LasNodeBase extends PointCloudNode {
    /** X position within the octree */
    x: number;
    /** Y position within the octree */
    y: number;
    /** Z position within the octree */
    z: number;

    crs: string;

    abstract override url: string;

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

    abstract override fetcher(url: string, networkOptions:  RequestInit): Promise<ArrayBuffer>;
    abstract override loadHierarchy(): Promise< Record<string, number> | Hierarchy.Subtree >;
    abstract override findAndCreateChild(depth: number, x: number, y: number, z: number): void;

    override get networkOptions(): RequestInit {
        return this.source.networkOptions;
    }
}

export default LasNodeBase;
