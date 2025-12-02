import * as THREE from 'three';
import OBB from 'Renderer/OBB';
import proj4 from 'proj4';
import { OrientationUtils, Coordinates } from '@itowns/geographic';

const size = new THREE.Vector3();
const position = new THREE.Vector3();
const translation = new THREE.Vector3();

/**
 * @property {number} numPoints - The number of points in this node.
 * @property {PointCloudSource} source - Data source of the node.
 * @property {string} crs - The crs of the node.
 * @property {PointCloudNode[]} children - The children nodes of this node.
 * @property {OBB} voxelOBB - The node cubique obb.
 * @property {OBB} clampOBB - The cubique obb clamped to zmin and zmax.
 * @property {number} sse - The sse of the node set at an nitial value of -1.
 */
class PointCloudNode extends THREE.EventDispatcher {
    constructor(depth, numPoints = 0, source) {
        super();

        this.depth = depth;
        this.numPoints = numPoints;

        this.source = source;

        this.children = [];

        this.sse = -1;
    }

    get pointSpacing() {
        return this.source.spacing / 2 ** this.depth;
    }

    get id() {
        throw new Error('In extended PointCloudNode, you have to implement the getter id!');
    }

    get octreeIsLoaded() {
        return this.numPoints >= 0;
    }

    get voxelOBB() {
        if (this._voxelOBB != undefined) { return this._voxelOBB; }
        this._voxelOBB = new OBB();
        if (this.depth === 0) {
            this._voxelOBB.setFromArray(this.source.bounds).projOBB(this.source.crs, this.crs);
        } else {
            this.setVoxelOBBFromParent();
        }
        return this._voxelOBB;
    }

    get clampOBB() {
    // Will be set from the boundingConforming metadata for the root node (if available)
    // or from the Voxel OBB clamped to the zmin and zmax value.
        if (this._clampOBB != undefined) { return this._clampOBB; }
        this._clampOBB = new OBB();
        if (this.depth === 0 && this.source.boundsConforming) {
            this._clampOBB.setFromArray(this.source.boundsConforming).projOBB(this.source.crs, this.crs);
        } else {
            this._clampOBB.copy(this.voxelOBB).clampZ(this.source.zmin, this.source.zmax);
        }
        return this._clampOBB;
    }

    // get the center of the node i.e. the center of the bounding box.
    get center() {
        if (this._center != undefined) { return this._center; }
        const centerBbox = new THREE.Vector3();
        this.clampOBB.box3D.getCenter(centerBbox);
        this._center =  new Coordinates(this.crs).setFromVector3(centerBbox.applyMatrix4(this.clampOBB.matrixWorld));
        return this._center;
    }

    // the origin is the center of the bounding box projected on the z=O local plan, in the world referential.
    get origin() {
        if (this._origin != undefined) { return this._origin; }
        const centerCrsIn = proj4(this.crs, this.source.crs).forward(this.center);
        this._origin =  new Coordinates(this.crs).setFromArray(proj4(this.source.crs, this.crs).forward([centerCrsIn.x, centerCrsIn.y, 0]));
        return this._origin;
    }

    /**
     * get the rotation between the local referentiel and the geocentrique one (if appliable).
     *
     * @returns {THREE.Quaternion}
     */
    get rotation() {
        if (this._rotation != undefined) { return this._rotation; }
        this._rotation = new THREE.Quaternion();
        if (proj4.defs(this.crs).projName === 'geocent') {
            this._rotation = OrientationUtils.quaternionFromCRSToCRS(this.crs, this.source.crs)(this.origin);
        }
        return this._rotation;
    }

    add(node) {
        this.children.push(node);
        node.parent = this;
    }

    /**
     * Set the voxelOBB (cubic (O)riented (B)ounding (B)ox for this node.
     * It needs to have a parent.
     */
    setVoxelOBBFromParent() {
        // initialize the child node obb
        this._voxelOBB.copy(this.parent.voxelOBB);
        const voxelBBox = this._voxelOBB.box3D;

        // factor to apply, based on the depth difference (can be > 1)
        const f = 2 ** (this.depth - this.parent.depth);

        // size of the child node bbox (Vector3), based on the size of the
        // parent node, and divided by the factor
        voxelBBox.getSize(size).divideScalar(f);

        // position of the parent node, if it was at the same depth as the
        // child, found by multiplying the tree position by the factor
        position.copy(this.parent).multiplyScalar(f);

        // difference in position between the two nodes, at child depth, and
        // scale it using the size
        translation.subVectors(this, position).multiply(size);

        // apply the translation to the child node bbox
        voxelBBox.min.add(translation);

        // use the size computed above to set the max
        voxelBBox.max.copy(voxelBBox.min).add(size);
    }

    async loadOctree() {
        throw new Error('In extended PointCloudNode, you have to implement the method loadOctree!');
    }

    networkOptions() {
        return this.source.networkOptions;
    }

    async load() {
        // Query octree/HRC if we don't have children yet.
        if (!this.octreeIsLoaded) {
            await this.loadOctree();
        }
        return this.source.fetcher(this.url, this.networkOptions())
            .then(file => this.source.parser(file, {
                in: this,
            }));
    }

    findCommonAncestor(node) {
        if (node.depth == this.depth) {
            if (node.id == this.id) {
                return node;
            } else if (node.depth != 0) {
                return this.parent.findCommonAncestor(node.parent);
            }
        } else if (node.depth < this.depth) {
            return this.parent.findCommonAncestor(node);
        } else {
            return this.findCommonAncestor(node.parent);
        }
    }
}

export default PointCloudNode;
