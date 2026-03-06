import { Vector3, type Box3, type Group } from 'three';
import PointCloudNode from 'Core/PointCloudNode';
// Create an A(xis)A(ligned)B(ounding)B(ox) for the child `childIndex`
// of one aabb. (PotreeConverter protocol builds implicit octree hierarchy
// by applying the same subdivision algo recursively)
const dHalfLength = new Vector3();

export function computeChildBBox(voxelBBox: Box3, childIndex: number) {
    // Code inspired from potree
    const childVoxelBBox = voxelBBox.clone();
    voxelBBox.getCenter(childVoxelBBox.max);
    dHalfLength.copy(childVoxelBBox.max).sub(voxelBBox.min);

    if (childIndex === 1) {
        childVoxelBBox.min.z += dHalfLength.z;
        childVoxelBBox.max.z += dHalfLength.z;
    } else if (childIndex === 3) {
        childVoxelBBox.min.z += dHalfLength.z;
        childVoxelBBox.max.z += dHalfLength.z;
        childVoxelBBox.min.y += dHalfLength.y;
        childVoxelBBox.max.y += dHalfLength.y;
    } else if (childIndex === 0) {
        //
    } else if (childIndex === 2) {
        childVoxelBBox.min.y += dHalfLength.y;
        childVoxelBBox.max.y += dHalfLength.y;
    } else if (childIndex === 5) {
        childVoxelBBox.min.z += dHalfLength.z;
        childVoxelBBox.max.z += dHalfLength.z;
        childVoxelBBox.min.x += dHalfLength.x;
        childVoxelBBox.max.x += dHalfLength.x;
    } else if (childIndex === 7) {
        childVoxelBBox.min.add(dHalfLength);
        childVoxelBBox.max.add(dHalfLength);
    } else if (childIndex === 4) {
        childVoxelBBox.min.x += dHalfLength.x;
        childVoxelBBox.max.x += dHalfLength.x;
    } else if (childIndex === 6) {
        childVoxelBBox.min.y += dHalfLength.y;
        childVoxelBBox.max.y += dHalfLength.y;
        childVoxelBBox.min.x += dHalfLength.x;
        childVoxelBBox.max.x += dHalfLength.x;
    }

    return childVoxelBBox;
}

export abstract class PotreeNodeBase extends PointCloudNode {
    override numPoints: number;
    crs: string;

    abstract hierarchyKey: string;
    abstract childrenBitField: number;

    constructor(
        depth: number,
        numPoints: number,
        crs: string,
    ) {
        super(depth);

        this.numPoints = numPoints;

        this.crs = crs;
    }

    override get childrenCreated(): boolean {
        return !(this.childrenBitField > 0 && this.children.length === 0);
    }

    override get hierarchyIsLoaded(): boolean {
        return this.numPoints >= 0;
    }

    override get id(): string {
        return this.hierarchyKey;
    }

    override fetcher(url: string, networkOptions = this.networkOptions): Promise<ArrayBuffer> {
        return this.source.fetcher(url, networkOptions);
    }

    override createChildAABB(childNode: this, childIndex: number): void {
        const childVoxelBBox = computeChildBBox(this.voxelOBB.natBox, childIndex);
        childNode.voxelOBB.setFromBox3(childVoxelBBox).projOBB(this.source.crs, this.crs);

        childNode.clampOBB.copy(childNode.voxelOBB);
        childNode.clampOBB.clampZ(this.source.zmin, this.source.zmax);

        (this.clampOBB.parent as Group).add(childNode.clampOBB);
        childNode.clampOBB.updateMatrixWorld(true);
    }
}

export default PotreeNodeBase;
