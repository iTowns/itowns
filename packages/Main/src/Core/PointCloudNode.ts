import * as THREE from 'three';
import OBB from 'Renderer/OBB';
import proj4 from 'proj4';
import { CRS, OrientationUtils, Coordinates } from '@itowns/geographic';

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

    /** The number of points in this node. */
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
    obj: THREE.Points | undefined;

    private _origin: Coordinates | undefined;
    private _rotation: THREE.Quaternion | undefined;

    constructor(depth: number, numPoints = 0) {
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
    }

    abstract get networkOptions(): RequestInit;
    abstract get octreeIsLoaded(): boolean;
    abstract get id(): string;
    abstract get url(): string;
    abstract loadOctree(): Promise<void>;
    abstract createChildAABB(node: PointCloudNode, indexChild: number): void;
    abstract fetcher(url: string, networkOptions:  RequestInit): Promise<ArrayBuffer>;

    get pointSpacing(): number {
        return this.source.spacing / 2 ** this.depth;
    }

    // the origin is the center of the clamped OBB projected
    // on the z=O local plan, in the world referential.
    get origin(): Coordinates {
        if (this._origin != undefined) { return this._origin; }
        const center = this.clampOBB.center;
        const centerCrsIn = CRS.transform(this.crs, this.source.crs).forward(center);
        this._origin =  new Coordinates(this.crs)
            .setFromArray(
                CRS.transform(this.source.crs, this.crs)
                    .forward([centerCrsIn.x, centerCrsIn.y, 0]));
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

    add(node: this, indexChild: number): void {
        this.children.push(node);
        node.parent = this;
        this.createChildAABB(node, indexChild);
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

    traverse(callback: (node: this) => void): void {
        callback(this);
        this.children.forEach(child => child.traverse(callback));
    }
}

export default PointCloudNode;
