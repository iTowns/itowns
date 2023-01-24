import * as THREE from 'three';
import TileGeometry from 'Core/TileGeometry';
import BuilderEllipsoidTile from 'Core/Prefab/Globe/BuilderEllipsoidTile';
import Coordinates from 'Core/Geographic/Coordinates';
import CRS from 'Core/Geographic/Crs';

// get oriented bounding box of tile
const builder = new BuilderEllipsoidTile({ crs: 'EPSG:4978', uvCount: 1 });
const size = new THREE.Vector3();
const dimension = new THREE.Vector2();
const center = new THREE.Vector3();
const coord = new Coordinates('EPSG:4326', 0, 0, 0);
let obb;

// it could be considered to remove THREE.Object3D extend.
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
        this.z = { min: 0, max: 0, scale: 1.0 };
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
        this.z.scale = cOBB.z.scale;
        return this;
    }

    /**
     * Update z min, z max and z scale of oriented bounding box
     *
     * @param {Object}  [elevation={}]
     * @param {number}  [elevation.min]             The minimum of oriented bounding box
     * @param {number}  [elevation.max]             The maximum of oriented bounding box
     * @param {number}  [elevation.scale]           The scale of oriented bounding box Z axis
     * @param {number}  [elevation.geoidHeight]     The geoid height added to ellipsoid.
     */
    updateZ(elevation = {}) {
        this.z.min = elevation.min ?? this.z.min;
        this.z.max = elevation.max ?? this.z.max;

        this.z.scale = elevation.scale > 0 ? elevation.scale : this.z.scale;
        this.z.delta = Math.abs(this.z.max - this.z.min) * this.z.scale;

        const geoidHeight = elevation.geoidHeight || 0;

        this.box3D.min.z = this.natBox.min.z + this.z.min * this.z.scale + geoidHeight;
        this.box3D.max.z = this.natBox.max.z + this.z.max * this.z.scale + geoidHeight;
    }

    /**
     * Determines if the sphere is above the XY space of the box
     *
     * @param      {Sphere}   sphere  The sphere
     * @return     {boolean}  True if sphere is above the XY space of the box, False otherwise.
     */
    isSphereAboveXYBox(sphere) {
        const localSpherePosition = this.worldToLocal(sphere.center);
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
            const segment = Math.max(Math.floor(sharableExtent.planarDimensions(dimension).x / 90 + 1), 2);
            const paramsGeometry = {
                extent: sharableExtent,
                level: 0,
                segment,
                disableSkirt: true,
                builder,
            };

            const geometry = new TileGeometry(paramsGeometry);
            obb.box3D.copy(geometry.boundingBox);
            obb.natBox.copy(geometry.boundingBox);
            this.copy(obb);

            this.updateZ({ min: minHeight, max: maxHeight });
            this.position.copy(position);
            this.quaternion.copy(quaternion);
            this.updateMatrixWorld(true);
        } else if (!CRS.isTms(extent.crs) && CRS.isMetricUnit(extent.crs)) {
            extent.center(coord).toVector3(this.position);
            extent.planarDimensions(dimension);
            size.set(dimension.x, dimension.y, Math.abs(maxHeight - minHeight));
            this.box3D.setFromCenterAndSize(center, size);
            this.updateMatrixWorld(true);
        } else {
            throw new Error('Unsupported extent crs');
        }
        return this;
    }
}

obb = new OBB();

export default OBB;
