import { Vector3 } from 'three';
import PointCloudNode, { PointCloudSource } from 'Core/PointCloudNode';

import type { Hierarchy } from 'copc';
import type OBB from 'Renderer/OBB';

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

    constructor(depth: number,
        x: number, y: number, z: number,
        source: PointCloudSource,
        numPoints: number = 0,
    ) {
        super(depth, numPoints);

        this.x = x;
        this.y = y;
        this.z = z;

        this.voxelKey = buildVoxelKey(depth, x, y, z);
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
     * Set the voxelOBB (cubic (O)riented (B)ounding (B)ox for this node.
     * It needs to have a parent.
     */
    override setVoxelOBBFromParent(): void {
        // initialize the child node obb
        const _voxelOBB = this._voxelOBB as OBB;
        const parent = this.parent as this;

        _voxelOBB.copy(parent.voxelOBB);
        const voxelBBox = _voxelOBB.box3D;

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
        voxelBBox.min.add(translation);

        // use the size computed above to set the max
        voxelBBox.max.copy(voxelBBox.min).add(size);
    }
}

export default LasNodeBase;
