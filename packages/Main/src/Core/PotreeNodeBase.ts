import { Vector3, type Box3, type Group } from 'three';
import PointCloudNode from './PointCloudNode';

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
    index: number;

    childrenBitField: number;
    baseurl: string;
    offsetBBox?: Box3;
    crs: string;

    private _hierarchyKey: string | undefined;

    constructor(
        depth: number,
        index: number,
        numPoints = 0,
        childrenBitField = 0,
        source: { baseurl: string },
        crs: string,
    ) {
        super(depth, numPoints);

        this.childrenBitField = childrenBitField;

        this.index = index;

        this.baseurl = source.baseurl;

        this.crs = crs;
    }

    override get octreeIsLoaded(): boolean {
        return !(this.childrenBitField && this.children.length === 0);
    }

    override get id(): string {
        return this.hierarchyKey;
    }

    get hierarchyKey(): string {
        if (this._hierarchyKey != undefined) { return this._hierarchyKey; }
        if (this.depth === 0) {
            this._hierarchyKey = 'r';
        } else {
            this._hierarchyKey = `${this.parent?.hierarchyKey}${this.index}`;
        }
        return this._hierarchyKey;
    }

    override fetcher(url: string, networkOptions: RequestInit): Promise<ArrayBuffer> {
        return this.source.fetcher(url, networkOptions);
    }

    override createChildAABB(childNode: this, childIndex: number): void {
        childNode.voxelOBB.copy(this.voxelOBB);
        childNode.voxelOBB.box3D = computeChildBBox(this.voxelOBB.box3D, childIndex);

        childNode.clampOBB.copy(childNode.voxelOBB);
        const childClampBBox = childNode.clampOBB.box3D;

        if (childClampBBox.min.z < this.source.zmax) {
            childClampBBox.max.z = Math.min(childClampBBox.max.z, this.source.zmax);
        }
        if (childClampBBox.max.z > this.source.zmin) {
            childClampBBox.min.z = Math.max(childClampBBox.min.z, this.source.zmin);
        }

        (this.clampOBB.parent as Group).add(childNode.clampOBB);
        childNode.clampOBB.updateMatrixWorld(true);
    }
}

export default PotreeNodeBase;
