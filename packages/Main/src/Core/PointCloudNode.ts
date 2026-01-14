import * as THREE from 'three';
import OBB from 'Renderer/OBB';
import proj4 from 'proj4';
import { OrientationUtils, Coordinates } from '@itowns/geographic';

export interface PointCloudSource {
    bounds: [number, number, number, number, number, number];
    boundsConforming: [number, number, number, number, number, number];
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

    private _center: Coordinates | undefined;
    private _origin: Coordinates | undefined;
    private _rotation: THREE.Quaternion | undefined;

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

    // get the center of the node i.e. the center of the bounding box.
    get center(): Coordinates {
        if (this._center != undefined) { return this._center; }
        const centerBbox = new THREE.Vector3();
        this.clampOBB.box3D.getCenter(centerBbox);
        this._center =  new Coordinates(this.crs)
            .setFromVector3(centerBbox.applyMatrix4(this.clampOBB.matrix));
        return this._center;
    }

    // the origin is the center of the bounding box projected
    // on the z=O local plan, in the world referential.
    get origin(): Coordinates {
        if (this._origin != undefined) { return this._origin; }
        const centerCrsIn = proj4(this.crs, this.source.crs).forward(this.center);
        this._origin =  new Coordinates(this.crs)
            .setFromArray(
                proj4(this.source.crs, this.crs).forward([centerCrsIn.x, centerCrsIn.y, 0]));
        return this._origin;
    }

    /**
     * get the rotation between the local referentiel and
     * the geocentrique one (if appliable).
     */
    get rotation(): THREE.Quaternion {
        if (this._rotation != undefined) { return this._rotation; }
        this._rotation = new THREE.Quaternion();
        if (proj4.defs(this.crs).projName === 'geocent') {
            this._rotation =
            OrientationUtils.quaternionFromCRSToCRS(this.crs, this.source.crs)(this.origin);
        }
        return this._rotation;
    }

    async load(): Promise<THREE.BufferGeometry> {
        // Query octree/HRC if we don't have children yet.
        if (!this.octreeIsLoaded) {
            await this.loadOctree();
        }
        return this.fetcher(this.url, this.networkOptions)
            .then(file => this.source.parser(file, {
                in: this,
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
