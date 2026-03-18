import * as THREE from 'three';
import type { Box3, Group } from 'three';
import OBB from 'Renderer/OBB';

export interface PointCloudSource {
    spacing: number;
    crs: string;
    zmin: number;
    zmax: number;
    fetcher: (url: string, options?: RequestInit) => Promise<ArrayBuffer>;
    parser: (data: ArrayBuffer, options: { in: PointCloudNode }) => THREE.BufferGeometry;
    networkOptions: RequestInit;
}

abstract class PointCloudNode extends THREE.EventDispatcher {
    /** The crs of the node. */
    abstract crs: string;
    /** Data source of the node. */
    abstract source: PointCloudSource;

    depth: number;

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
    obj: THREE.Points | undefined;

    abstract numPoints: number;

    constructor(depth: number) {
        super();

        this.depth = depth;

        this.children = [];
        this.parent = undefined;

        this.voxelOBB = new OBB();
        this.clampOBB = new OBB();
        this.sse = -1;

        this.visible = false;
        this.promise = null;
    }

    abstract childrenCreated: boolean;
    abstract get networkOptions(): RequestInit;
    abstract get id(): string;
    abstract get url(): string;

    abstract fetcher(url: string, networkOptions:  RequestInit): Promise<ArrayBuffer>;
    abstract computeBBoxFromParent(): Box3;
    abstract createChildren(): Promise<void>;

    get pointSpacing(): number {
        return this.source.spacing / 2 ** this.depth;
    }

    get hierarchyIsLoaded(): boolean {
        return this.numPoints >= 0;
    }

    async load(): Promise<THREE.BufferGeometry> {
        if (!this.childrenCreated) {
            await this.createChildren();
        }
        return this.fetcher(this.url, this.networkOptions)
            .then(file => this.source.parser(file, {
                in: this,
            }));
    }

    add(node: this): void {
        this.children.push(node);
        node.parent = this;
        node.setOBBes();
    }

    // Compute the voxelOBB and the clampOBB for this node
    setOBBes(): void {
        const parent = this.parent as this;

        // set the voxelOBB
        const childVoxelBBox = this.computeBBoxFromParent();
        this.voxelOBB.setFromBox3(childVoxelBBox).projOBB(this.source.crs, this.crs);

        // get the clamped bbox from the voxel bbox
        this.clampOBB.copy(this.voxelOBB)
            .clampZ(this.source.zmin, this.source.zmax);
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
