import * as THREE from 'three';
import TileGeometry from 'Core/TileGeometry';
import BuilderEllipsoidTile from 'Core/Prefab/Globe/BuilderEllipsoidTile';
import Coordinates from 'Core/Geographic/Coordinates';
import CRS from 'Core/Geographic/Crs';

// get oriented bounding box of tile
const builder = new BuilderEllipsoidTile();
const size = new THREE.Vector3();
const dimension = new THREE.Vector2();
const center = new THREE.Vector3();
const coord = new Coordinates('EPSG:4326', 0, 0, 0);

class OBB extends THREE.Object3D {
    /**
     * Oriented bounding box
     * @constructor
     * @extends THREE.Object3D
     * @param {THREE.Vector3}  min representing the lower (x, y, z) boundary of the box. Default is ( + Infinity, + Infinity, + Infinity ).
     * @param {THREE.Vector3}  max representing the lower upper (x, y, z) boundary of the box. Default is ( - Infinity, - Infinity, - Infinity ).
     */
    constructor(min = new THREE.Vector3(+Infinity, +Infinity, +Infinity), max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)) {
        super();
        this.box3D = new THREE.Box3(min.clone(), max.clone());
        this.natBox = this.box3D.clone();
        this.z = { min: 0, max: 0 };
        return this;
    }

    /**
     * Creates a new instance of the object with same properties than original.
     *
     * @return     {OBB}  Copy of this object.
     */
    clone() {
        return new OBB().copy(this);
    }

    /**
     * Copy the property of OBB
     *
     * @param      {OBB}  cOBB OBB to copy
     * @return     {OBB}  the copy
     */
    copy(cOBB) {
        super.copy(cOBB);
        this.box3D.copy(cOBB.box3D);
        this.natBox.copy(cOBB.natBox);
        this.z.min = cOBB.z.min;
        this.z.max = cOBB.z.max;
        return this;
    }

    /**
     * Update the top point world
     *
     */
    update() {
        this.updateMatrixWorld(true);
    }

    /**
     * Update z min and z max of oriented bounding box
     *
     * @param {number}  min The minimum of oriented bounding box
     * @param {number}  max The maximum of oriented bounding box
     */
    updateZ(min, max) {
        this.z = { min, max };
        this.box3D.min.z = this.natBox.min.z + min;
        this.box3D.max.z = this.natBox.max.z + max;
    }

    /**
     * Set bouding box value to points
     *
     * @param      {Array<THREE.Vector3>}  points  The points to set
     * @return     {Array<THREE.Vector3>}  The points seted
     */
    toPoints(points) {
        // top points of bounding box
        points[0].set(this.box3D.max.x, this.box3D.max.y, this.box3D.max.z);
        points[1].set(this.box3D.min.x, this.box3D.max.y, this.box3D.max.z);
        points[2].set(this.box3D.min.x, this.box3D.min.y, this.box3D.max.z);
        points[3].set(this.box3D.max.x, this.box3D.min.y, this.box3D.max.z);
        points[4].set(this.box3D.max.x, this.box3D.max.y, this.box3D.min.z);
        points[5].set(this.box3D.min.x, this.box3D.max.y, this.box3D.min.z);
        points[6].set(this.box3D.min.x, this.box3D.min.y, this.box3D.min.z);
        points[7].set(this.box3D.max.x, this.box3D.min.y, this.box3D.min.z);

        return points;
    }

    /**
     * Determines if the sphere is above the XY space of the box
     *
     * @param      {Sphere}   sphere  The sphere
     * @return     {boolean}  True if sphere is above the XY space of the box, False otherwise.
     */
    isSphereAboveXYBox(sphere) {
        const localSpherePosition = this.worldToLocal(sphere.position);
        // get obb closest point to sphere center by clamping
        const x = Math.max(this.box3D.min.x, Math.min(localSpherePosition.x, this.box3D.max.x));
        const y = Math.max(this.box3D.min.y, Math.min(localSpherePosition.y, this.box3D.max.y));

        // this is the same as isPointInsideSphere.position
        const distance = Math.sqrt((x - localSpherePosition.x) * (x - localSpherePosition.x) +
                               (y - localSpherePosition.y) * (y - localSpherePosition.y));

        return distance < sphere.radius;
    }

    /**
     * Compute OBB from extent.
     * The OBB resulted can be only in the system 'EPSG:3946'.
     *
     * @param      {Extent}        extent     The extent (with crs 'EPSG:4326') to compute oriented bounding box
     * @param      {number}        minHeight  The minimum height of OBB
     * @param      {number}        maxHeight  The maximum height of OBB
     * @return     {OBB}           return this object
     */
    setFromExtent(extent, minHeight = extent.min || 0, maxHeight = extent.max || 0) {
        if (extent.crs == 'EPSG:4326') {
            const { sharableExtent, quaternion, position } = builder.computeSharableExtent(extent);
            // Compute the minimum count of segment to build tile
            const segment = Math.max(Math.floor(sharableExtent.dimensions(dimension).x / 90 + 1), 2);
            const paramsGeometry = {
                extent: sharableExtent,
                level: 0,
                segment,
                disableSkirt: true,
                builder,
            };

            const geometry = new TileGeometry(paramsGeometry);
            this.copy(builder.OBB(geometry.boundingBox));

            this.updateZ(minHeight, maxHeight);
            this.position.copy(position);
            this.quaternion.copy(quaternion);
            this.updateMatrixWorld(true);
        } else if (!extent.isTiledCrs() && CRS.isMetricUnit(extent.crs)) {
            extent.center(coord).xyz(this.position);
            extent.dimensions(dimension);
            size.set(dimension.x, dimension.y, Math.abs(maxHeight - minHeight));
            this.box3D.setFromCenterAndSize(center, size);
            this.updateMatrixWorld(true);
        } else {
            throw new Error('Unsupported extent crs');
        }
        return this;
    }
}

export default OBB;
