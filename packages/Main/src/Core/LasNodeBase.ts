import PointCloudNode from 'Core/PointCloudNode';

abstract class LasNodeBase extends PointCloudNode {
    /** X position within the octree */
    x: number;
    /** Y position within the octree */
    y: number;
    /** Z position within the octree */
    z: number;

    constructor(
        depth: number,
        x: number, y: number, z: number,
        numPoints: number,
    ) {
        super(depth, numPoints);

        this.x = x;
        this.y = y;
        this.z = z;
    }

    override get networkOptions(): RequestInit {
        return this.source.networkOptions;
    }
}

export default LasNodeBase;
