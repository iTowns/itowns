import * as THREE from 'three';
import OBB from 'Renderer/OBB';

export interface PointCloudSource {
    bounds: [number, number, number, number, number, number];
    boundsConforming: [number, number, number, number, number, number];
    spacing: number;
    crs: string;
    zmin: number;
    zmax: number;
    fetcher: (url: string, options?: RequestInit) => Promise<ArrayBuffer>;
    parser: (data: ArrayBuffer,
            options: { in: PointCloudNode,
                       out: { crs: string },
                     }) => THREE.BufferGeometry;
    networkOptions: RequestInit;
}

abstract class PointCloudNode extends THREE.EventDispatcher {
    /** The crs of the node. */
    abstract crs: string;
    /** Data source of the node. */
    abstract source: PointCloudSource;

    depth: number;

    /** The number of points in this node. */
    numPoints: number;
    /** The children nodes of this node. */
    children: this[];
    parent: this | undefined;

    // Properties used internally by PointCloud layer
    visible: boolean;
    /** The sse of the node set at an nitial value of -1. */
    sse: number;
    notVisibleSince: number | undefined;
    promise: Promise<unknown> | null;
    obj: THREE.Points | undefined;

    protected  _voxelOBB: OBB | undefined;
    private _clampOBB: OBB | undefined;

    constructor(depth: number, numPoints = 0) {
        super();

        this.depth = depth;

        this.numPoints = numPoints;

        this.children = [];
        this.parent = undefined;

        this.sse = -1;

        this.visible = false;
        this.promise = null;
    }

    abstract get networkOptions(): RequestInit;
    abstract get octreeIsLoaded(): boolean;
    abstract get id(): string;
    abstract get url(): string;
    abstract loadOctree(): Promise<void>;
    abstract setVoxelOBBFromParent(): void;
    abstract fetcher(url: string, networkOptions:  RequestInit): Promise<ArrayBuffer>;

    get pointSpacing(): number {
        return this.source.spacing / 2 ** this.depth;
    }

    /** The node cubique obb. */
    get voxelOBB() {
        if (this._voxelOBB != undefined) { return this._voxelOBB; }
        this._voxelOBB = new OBB();
        if (this.depth === 0) {
            this._voxelOBB.setFromArray(this.source.bounds)
                .projOBB(this.source.crs, this.crs);
        } else {
            this.setVoxelOBBFromParent();
        }
        return this._voxelOBB;
    }

    /** A cubique obb closer to the data. */
    get clampOBB() {
    // For the root node:
    // will be set from the boundingConforming metadata (if available)
    // or from the Voxel OBB clamped to the zmin and zmax value.
        if (this._clampOBB != undefined) { return this._clampOBB; }
        this._clampOBB = new OBB();
        if (this.depth === 0 && this.source.boundsConforming) {
            this._clampOBB.setFromArray(this.source.boundsConforming)
                .projOBB(this.source.crs, this.crs);
        } else {
            this._clampOBB.copy(this.voxelOBB).clampZ(this.source.zmin, this.source.zmax);
        }
        return this._clampOBB;
    }

    async load(crs: string): Promise<THREE.BufferGeometry> {
        // Query octree/HRC if we don't have children yet.
        if (!this.octreeIsLoaded) {
            await this.loadOctree();
        }
        return this.fetcher(this.url, this.networkOptions)
            .then(file => this.source.parser(file, {
                in: this,
                out: { crs },
            }));
    }

    add(node: this): void {
        this.children.push(node);
        node.parent = this;
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
