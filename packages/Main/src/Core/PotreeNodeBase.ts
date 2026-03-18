import { Vector3, type Box3, type Group } from 'three';
import PointCloudNode from 'Core/PointCloudNode';
import type { PotreeNodeInfo } from 'Core/PotreeNode';
import type { Potree2NodeInfo } from 'Core/Potree2Node';

// Compute the Bounding Box for the child `childIndex` from
// his parent. (PotreeConverter protocol builds implicit octree
// hierarchy by applying the same subdivision algo recursively)
const dHalfLength = new Vector3();
function computeBBoxFromParent(parentVoxelBBox: Box3, childIndex: number) {
    // Code inspired from potree
    const childVoxelBBox = parentVoxelBBox.clone();
    parentVoxelBBox.getCenter(childVoxelBBox.max);
    dHalfLength.copy(childVoxelBBox.max).sub(parentVoxelBBox.min);

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

    abstract get networkOptions(): RequestInit;
    abstract get url(): string;
    abstract loadHierarchy(): Promise<
        Record<string, PotreeNodeInfo> | Record<string, Potree2NodeInfo>
    >;
    abstract createChildren(): Promise<void>;


    override get childrenCreated(): boolean {
        return !(this.childrenBitField > 0 && this.children.length === 0);
    }

    override get id(): string {
        return this.hierarchyKey;
    }

    override fetcher(url: string, networkOptions = this.networkOptions): Promise<ArrayBuffer> {
        return this.source.fetcher(url, networkOptions);
    }

    // Compute the voxelOBB and the clampOBB for this node
    override setOBBes(): void {
        const parent = this.parent as this;

        const index = Number(this.hierarchyKey.charAt(this.depth));
        const voxelBBox = computeBBoxFromParent(parent.voxelOBB.natBox, index);

        // set the voxelOBB
        this.voxelOBB.setFromBox3(voxelBBox).projOBB(this.source.crs, this.crs);

        // get the clamped bbox from the voxel bbox
        this.clampOBB.copy(this.voxelOBB)
            .clampZ(this.source.zmin, this.source.zmax);
    }
}

export default PotreeNodeBase;
