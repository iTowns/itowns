import PointCloudNode from 'Core/PointCloudNode';

abstract class LasNodeBase extends PointCloudNode {
    /** X position within the octree */
    x: number;
    /** Y position within the octree */
    y: number;
    /** Z position within the octree */
    z: number;

    crs: string;

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

    override get networkOptions(): RequestInit {
        return this.source.networkOptions;
    }
}

export default LasNodeBase;
