import { Vector3, type Group } from 'three';
import type { Hierarchy } from 'copc';
import PointCloudNode, { PointCloudSource } from 'Core/PointCloudNode';

const size = new Vector3();
const position = new Vector3();
const translation = new Vector3();

function buildVoxelKey(depth: number, x: number, y: number, z: number): string {
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
        return `${this.depth}${this.x}${this.y}${this.z}`;
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
        childNode.voxelOBB.copy(this.voxelOBB);
        const voxelBBox = this.voxelOBB.box3D;
        const childVoxelBBox = childNode.voxelOBB.box3D;

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

        // get a clamped bbox from the voxel bbox
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

export default LasNodeBase;
