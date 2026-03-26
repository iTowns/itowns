import { Vector3, Box3 } from 'three';
import type { Hierarchy } from 'copc';
import PointCloudNode, { PointCloudSource } from 'Core/PointCloudNode';

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
    /** The depth of the node in the tree */

    /** The id of the node, constituted of the four
     * components: `depth-x-y-z`. */
    voxelKey: string;

    crs: string;

    constructor(depth: number,
        x: number, y: number, z: number,
        source: PointCloudSource,
        numPoints: number,
        crs: string,
    ) {
        super(depth, numPoints);

        this.x = x;
        this.y = y;
        this.z = z;

        this.voxelKey = buildVoxelKey(depth, x, y, z);

        this.crs = crs;
    }

    override get networkOptions(): RequestInit {
        return this.source.networkOptions;
    }

    override get octreeIsLoaded(): boolean {
        return this.numPoints >= 0;
    }

    override get id(): string {
        const strX = this.x.toString();
        const strY = this.y.toString();
        const strZ = this.z.toString();
        const pad = Math.max(strX.length, strY.length, strZ.length);
        return this.depth.toString() +
            strX.padStart(pad, '0') + strY.padStart(pad, '0') + strZ.padStart(pad, '0');
    }

    abstract findAndCreateChild(
        depth: number,
        x: number, y: number, z: number,
        hierarchy: Record<string, number> | Hierarchy.Subtree,
        stack: this[],
    ): void;

    /**
     * Create an (A)xis (A)ligned (B)ounding (B)ox for the given node given
     * `this` is its parent.
     * @param childNode - The child node
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    override createChildAABB(childNode: this, _indexChild: number): void {
        // initialize the child node obb
        const voxelBBox = this.voxelOBB.natBox;
        const childVoxelBBox = box3.copy(voxelBBox);

        // factor to apply, based on the depth difference (can be > 1)
        const f = 2 ** (childNode.depth - this.depth);

        // size of the child node bbox (Vector3), based on the size of the
        // parent node, and divided by the factor
        voxelBBox.getSize(size).divideScalar(f);

        // position of the parent node, if it was at the same depth as the
        // child, found by multiplying the tree position by the factor
        position.copy(this).multiplyScalar(f);

        // difference in position between the two nodes, at child depth, and
        // scale it using the size
        translation.subVectors(childNode, position).multiply(size);

        // apply the translation to the child node bbox
        childVoxelBBox.min.add(translation);

        // use the size computed above to set the max
        childVoxelBBox.max.copy(childVoxelBBox.min).add(size);

        childNode.voxelOBB.setFromBox3(childVoxelBBox).projOBB(this.source.crs, this.crs);

        // get a clamped bbox from the voxel bbox
        childNode.clampOBB.copy(childNode.voxelOBB).clampZ(this.source.zmin, this.source.zmax);
    }
}

export default LasNodeBase;
