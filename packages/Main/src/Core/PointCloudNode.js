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
    constructor(numPoints = 0, source) {
        super();

        this.numPoints = numPoints;

        this.source = source;

        this.children = [];
        this.voxelOBB = new OBB();
        this.clampOBB = new OBB();
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

    // get the center of the node i.e. the center of the bounding box.
    get center() {
        if (this._center != undefined) { return this._center; }
        const centerBbox = new THREE.Vector3();
        this.voxelOBB.box3D.getCenter(centerBbox);
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

    setOBBes(min, max) {
        const root = this;
        const crs = {
            in: root.source.crs,
            out: this.crs,
        };
        const zmin = root.source.zmin;
        const zmax = root.source.zmax;

        let forward = (x => x);
        if (crs.in !== crs.out) {
            try {
                forward = proj4(crs.in, crs.out).forward;
            } catch (err) {
                throw new Error(`${err} is not defined in proj4`);
            }
        }

        const corners = [
            ...forward([max[0], max[1], max[2]]),
            ...forward([min[0], max[1], max[2]]),
            ...forward([min[0], min[1], max[2]]),
            ...forward([max[0], min[1], max[2]]),
            ...forward([max[0], max[1], min[2]]),
            ...forward([min[0], max[1], min[2]]),
            ...forward([min[0], min[1], min[2]]),
            ...forward([max[0], min[1], min[2]]),
        ];

        // get center of box at altitude Z=0 and project it in view crs;
        const origin = forward([(min[0] + max[0]) * 0.5, (min[1] + max[1]) * 0.5, 0]);

        // get LocalRotation
        const isGeocentric = proj4.defs(crs.out).projName === 'geocent';
        let rotation = new THREE.Quaternion();
        if (isGeocentric) {
            const coordOrigin = new Coordinates(crs.out).setFromArray(origin);
            rotation = OrientationUtils.quaternionFromCRSToCRS(crs.out, crs.in)(coordOrigin);
        }

        // project corners in local referentiel
        const cornersLocal = [];
        for (let i = 0; i < 24; i += 3) {
            const cornerLocal = new THREE.Vector3(
                corners[i] - origin[0],
                corners[i + 1] - origin[1],
                corners[i + 2] - origin[2],
            );
            cornerLocal.applyQuaternion(rotation);
            cornersLocal.push(...cornerLocal.toArray());
        }

        // get the bbox containing all cornersLocal => the bboxLocal
        root.voxelOBB.box3D.setFromArray(cornersLocal);
        root.voxelOBB.position.set(...origin);
        root.voxelOBB.quaternion.copy(rotation).invert();

        root.voxelOBB.updateMatrix();
        root.voxelOBB.updateMatrixWorld(true);

        root.voxelOBB.matrixWorldInverse = root.voxelOBB.matrixWorld.clone().invert();

        root.clampOBB.copy(root.voxelOBB);

        const clampBBox = root.clampOBB.box3D;
        if (clampBBox.min.z < zmax) {
            clampBBox.max.z = Math.min(clampBBox.max.z, zmax);
        }
        if (clampBBox.max.z > zmin) {
            clampBBox.min.z = Math.max(clampBBox.min.z, zmin);
        }

        root.clampOBB.matrixWorldInverse = root.voxelOBB.matrixWorldInverse;
    }

    add(node, indexChild) {
        this.children.push(node);
        node.parent = this;
        this.createChildAABB(node, indexChild);
    }

    /**
     * Create an (A)xis (A)ligned (B)ounding (B)ox for the given node given
     * `this` is its parent.
     * @param {CopcNode} childNode - The child node
     */
    createChildAABB(childNode) {
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

        childNode.voxelOBB.matrixWorldInverse = this.voxelOBB.matrixWorldInverse;
        childNode.clampOBB.matrixWorldInverse = this.clampOBB.matrixWorldInverse;
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
