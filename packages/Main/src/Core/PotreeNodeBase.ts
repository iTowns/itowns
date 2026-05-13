import PointCloudNode from 'Core/PointCloudNode';

export type NodeKeyInfo = {
    depth: number,
    x: number, y: number, z: number,
}

export function getChildVoxelKey(nodeInfo: NodeKeyInfo, childIndex: number) {
    const depth = nodeInfo.depth + 1;
    let x = 2 * nodeInfo.x;
    let y = 2 * nodeInfo.y;
    let z = 2 * nodeInfo.z;

    if (childIndex === 1) {
        z += 1;
    } else if (childIndex === 3) {
        y += 1;
        z += 1;
    } else if (childIndex === 0) {
        //
    } else if (childIndex === 2) {
        y += 1;
    } else if (childIndex === 5) {
        x += 1;
        z += 1;
    } else if (childIndex === 7) {
        x += 1;
        y += 1;
        z += 1;
    } else if (childIndex === 4) {
        x += 1;
    } else if (childIndex === 6) {
        x += 1;
        y += 1;
    }
    return {
        depth,
        x,
        y,
        z,
    };
}

export abstract class PotreeNodeBase extends PointCloudNode {
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

    override fetcher(url: string, networkOptions = this.networkOptions): Promise<ArrayBuffer> {
        return this.source.fetcher(url, networkOptions);
    }
}

export default PotreeNodeBase;
