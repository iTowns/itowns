import * as THREE from 'three';
import { Vector3, Box3 } from 'three';
import OBB from 'Renderer/OBB';

import type { Hierarchy } from 'copc';
import type { PotreeNodeHierarchy } from 'Core/PotreeNode';
import type { Potree2NodeHierarchy } from 'Core/Potree2Node';

const size = new Vector3();
const position = new Vector3();
const translation = new Vector3();

const box3 = new Box3();

export interface PointCloudSource {
    spacing: number;
    crs: string;
    zmin: number;
    zmax: number;
    fetcher: (url: string, options?: RequestInit) => Promise<ArrayBuffer>;
    parser: (data: ArrayBuffer, options: { in: PointCloudNode }) => THREE.BufferGeometry;
    networkOptions: RequestInit;
}

export function buildVoxelKey(depth: number, x: number, y: number, z: number): string {
    return `${depth}-${x}-${y}-${z}`;
}

abstract class PointCloudNode extends THREE.EventDispatcher {
    /** The crs of the node. */
    abstract crs: string;
    /** Data source of the node. */
    abstract source: PointCloudSource;

    depth: number;
    /** The number of points in this node.
    * '-1' is the node has been loaded yet */
    numPoints: number;

    /** The children nodes of this node. */
    children: this[];
    parent: this | undefined;

    /** The node cubique obb. */
    voxelOBB: OBB;
    /** The cubique obb clamped to zmin and zmax. */
    clampOBB: OBB;

    // Properties used internally by PointCloud layer
    visible: boolean;
    /** The sse of the node set at an nitial value of -1. */
    sse: number;
    notVisibleSince: number | undefined;
    promise: Promise<unknown> | null;
    obj: THREE.Points & { matrixWorldInverse?: THREE.Matrix4 } | undefined;

    abstract url: string;

    abstract x: number;
    abstract y: number;
    abstract z: number;

    private _childrenCreated: boolean;

    constructor(depth: number, numPoints: number = -1) {
        super();

        this.depth = depth;
        this.numPoints = numPoints;

        this.children = [];
        this.parent = undefined;

        this.voxelOBB = new OBB();
        this.clampOBB = new OBB();
        this.sse = -1;

        this.visible = false;
        this.promise = null;

        this._childrenCreated = false;
    }

    abstract get networkOptions(): RequestInit;

    abstract fetcher(url: string, networkOptions:  RequestInit): Promise<ArrayBuffer>;
    abstract loadHierarchy(): Promise<
        Record<string, number> |
        Hierarchy.Subtree |
        Record<string, PotreeNodeHierarchy> |
        Record<string, Potree2NodeHierarchy>
    >;
    abstract findAndCreateChild(depth: number, x: number, y: number, z: number): void;

    get pointSpacing(): number {
        return this.source.spacing / 2 ** this.depth;
    }

    get hierarchyIsLoaded(): boolean {
        return this.numPoints >= 0;
    }

    get id(): string {
        const strX = this.x.toString();
        const strY = this.y.toString();
        const strZ = this.z.toString();
        const pad = Math.max(strX.length, strY.length, strZ.length);
        return this.depth.toString() +
            strX.padStart(pad, '0') + strY.padStart(pad, '0') + strZ.padStart(pad, '0');
    }

    async load(): Promise<THREE.BufferGeometry> {
        if (!this._childrenCreated) {
            await this.createChildren();
        }
        return this.fetcher(this.url, this.networkOptions)
            .then(file => this.source.parser(file, {
                in: this,
            }));
    }

    async createChildren(): Promise<void> {
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

    add(node: this): void {
        this.children.push(node);
        node.parent = this;
        node.setOBBes();
    }

    // Compute the voxelOBB and the clampOBB for this node
    setOBBes(): void {
        // set the voxelOBB
        const childVoxelBBox = this.computeBBoxFromParent();
        this.voxelOBB.setFromBox3(childVoxelBBox).projOBB(this.source.crs, this.crs);

        // get the clamped bbox from the voxel bbox
        this.clampOBB.copy(this.voxelOBB)
            .clampZ(this.source.zmin, this.source.zmax);
    }

    computeBBoxFromParent(): Box3 {
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

    findCommonAncestor(node: this): this | undefined {
        if (node.depth == this.depth) {
            if (node.id == this.id) {
                return node;
            } else if (node.depth != 0) {
                return (this.parent as this).findCommonAncestor(node.parent as this);
            }
        } else if (node.depth < this.depth) {
            return (this.parent as this).findCommonAncestor(node);
        } else {
            return this.findCommonAncestor(node.parent as this);
        }
    }
}

export default PointCloudNode;
