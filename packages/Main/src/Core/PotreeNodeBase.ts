import { Vector3, type Box3 } from 'three';
import PointCloudNode from 'Core/PointCloudNode';

import type OBB from 'Renderer/OBB';

const dHalfLength = new Vector3();
const dHalfLength2 = new Vector3();

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

    override setVoxelOBBFromParent():void {
        // for potree the voxelOBB.natBox is updated as well
        const _voxelOBB = this._voxelOBB as OBB;
        const parent = this.parent as this;

        _voxelOBB.copy(parent.voxelOBB);

        // Code inspired from potree
        // (PotreeConverter protocol builds implicit octree hierarchy
        // by applying the same subdivision algo recursively)
        const voxelBBox = _voxelOBB.box3D;
        voxelBBox.getCenter(voxelBBox.max);
        dHalfLength.copy(voxelBBox.max).sub(voxelBBox.min);

        const voxelNatbox = _voxelOBB.natBox;
        voxelNatbox.getCenter(voxelNatbox.max);
        dHalfLength2.copy(voxelNatbox.max).sub(voxelNatbox.min);

        const childIndex = this.index;
        if (childIndex === 1) {
            voxelBBox.min.z += dHalfLength.z;
            voxelBBox.max.z += dHalfLength.z;

            voxelNatbox.min.z += dHalfLength.z;
            voxelNatbox.max.z += dHalfLength.z;
        } else if (childIndex === 3) {
            voxelBBox.min.z += dHalfLength.z;
            voxelBBox.max.z += dHalfLength.z;
            voxelBBox.min.y += dHalfLength.y;
            voxelBBox.max.y += dHalfLength.y;

            voxelNatbox.min.z += dHalfLength.z;
            voxelNatbox.max.z += dHalfLength.z;
            voxelNatbox.min.y += dHalfLength.y;
            voxelNatbox.max.y += dHalfLength.y;
        } else if (childIndex === 0) {
            //
        } else if (childIndex === 2) {
            voxelBBox.min.y += dHalfLength.y;
            voxelBBox.max.y += dHalfLength.y;

            voxelNatbox.min.y += dHalfLength.y;
            voxelNatbox.max.y += dHalfLength.y;
        } else if (childIndex === 5) {
            voxelBBox.min.z += dHalfLength.z;
            voxelBBox.max.z += dHalfLength.z;
            voxelBBox.min.x += dHalfLength.x;
            voxelBBox.max.x += dHalfLength.x;

            voxelNatbox.min.z += dHalfLength.z;
            voxelNatbox.max.z += dHalfLength.z;
            voxelNatbox.min.x += dHalfLength.x;
            voxelNatbox.max.x += dHalfLength.x;
        } else if (childIndex === 7) {
            voxelBBox.min.add(dHalfLength);
            voxelBBox.max.add(dHalfLength);

            voxelNatbox.min.add(dHalfLength);
            voxelNatbox.max.add(dHalfLength);
        } else if (childIndex === 4) {
            voxelBBox.min.x += dHalfLength.x;
            voxelBBox.max.x += dHalfLength.x;

            voxelNatbox.min.x += dHalfLength.x;
            voxelNatbox.max.x += dHalfLength.x;
        } else if (childIndex === 6) {
            voxelBBox.min.y += dHalfLength.y;
            voxelBBox.max.y += dHalfLength.y;
            voxelBBox.min.x += dHalfLength.x;
            voxelBBox.max.x += dHalfLength.x;

            voxelNatbox.min.y += dHalfLength.y;
            voxelNatbox.max.y += dHalfLength.y;
            voxelNatbox.min.x += dHalfLength.x;
            voxelNatbox.max.x += dHalfLength.x;
        }
    }
}

export default PotreeNodeBase;
