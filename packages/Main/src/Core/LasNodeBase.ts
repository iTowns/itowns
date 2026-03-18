import { Vector3, Box3 } from 'three';
import type { Hierarchy } from 'copc';
import PointCloudNode from 'Core/PointCloudNode';

const size = new Vector3();
const position = new Vector3();
const translation = new Vector3();

const box3 = new Box3();

export function buildVoxelKey(depth: number, x: number, y: number, z: number): string {
    return `${depth}-${x}-${y}-${z}`;
}

abstract class LasNodeBase extends PointCloudNode {
    /** X position within the octree */
    x: number;
    /** Y position within the octree */
    y: number;
    /** Z position within the octree */
    z: number;

    /** The number of points in this node.
     * '-1' is the node has been loaded yet */
    override numPoints: number;

    crs: string;

    private _childrenCreated: boolean;

    constructor(
        depth: number,
        x: number, y: number, z: number,
        numPoints: number,
        crs: string,
    ) {
        super(depth);

        this.x = x;
        this.y = y;
        this.z = z;

        this.numPoints = numPoints;

        this.crs = crs;

        this._childrenCreated = false;
    }

    abstract get url(): string;
    abstract fetcher(url: string, networkOptions:  RequestInit): Promise<ArrayBuffer>;
    abstract loadHierarchy(): Promise<Record<string, number> | Hierarchy.Subtree>;
    abstract findAndCreateChild(depth: number, x: number, y: number, z: number): void;

    override get networkOptions(): RequestInit {
        return this.source.networkOptions;
    }

    override get childrenCreated(): boolean {
        return this._childrenCreated;
    }

    override get id(): string {
        const strX = this.x.toString();
        const strY = this.y.toString();
        const strZ = this.z.toString();
        const pad = Math.max(strX.length, strY.length, strZ.length);
        return this.depth.toString() +
            strX.padStart(pad, '0') + strY.padStart(pad, '0') + strZ.padStart(pad, '0');
    }

    override async createChildren(): Promise<void> {
        await this.loadHierarchy();

        const depth = this.depth + 1;
        const x = this.x * 2;
        const y = this.y * 2;
        const z = this.z * 2;

        this.findAndCreateChild(depth, x,     y,     z);
        this.findAndCreateChild(depth, x + 1, y,     z);
        this.findAndCreateChild(depth, x,     y + 1, z);
        this.findAndCreateChild(depth, x + 1, y + 1, z);
        this.findAndCreateChild(depth, x,     y,     z + 1);
        this.findAndCreateChild(depth, x + 1, y,     z + 1);
        this.findAndCreateChild(depth, x,     y + 1, z + 1);
        this.findAndCreateChild(depth, x + 1, y + 1, z + 1);
        this._childrenCreated = true;
    }

    override computeBBoxFromParent(): Box3 {
        const parent = this.parent as this;

        // initialize the child node obb
        const voxelBBox = parent.voxelOBB.natBox;
        const childVoxelBBox = box3.copy(voxelBBox);

        // factor to apply, based on the depth difference (can be > 1)
        const f = 2 ** (this.depth - parent.depth);

        // size of the child node bbox (Vector3), based on the size of the
        // parent node, and divided by the factor
        voxelBBox.getSize(size).divideScalar(f);

        // position of the parent node, if it was at the same depth as the
        // child, found by multiplying the tree position by the factor
        position.copy(parent).multiplyScalar(f);

        // difference in position between the two nodes, at child depth, and
        // scale it using the size
        translation.subVectors(this, position).multiply(size);

        // apply the translation to the child node bbox
        childVoxelBBox.min.add(translation);

        // use the size computed above to set the max
        childVoxelBBox.max.copy(childVoxelBBox.min).add(size);

        return childVoxelBBox;
    }
}

export default LasNodeBase;
