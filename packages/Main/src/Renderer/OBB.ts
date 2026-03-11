import * as THREE from 'three';
import proj4 from 'proj4';
import { TileGeometry } from 'Core/TileGeometry';
import { GlobeTileBuilder } from 'Core/Prefab/Globe/GlobeTileBuilder';
import { CRS, Coordinates, OrientationUtils } from '@itowns/geographic';

import type { Extent, ProjectionLike } from '@itowns/geographic';

// import from OrientationUtils ?
type QuaternionFunction = (coords: Coordinates, target?: THREE.Quaternion) => THREE.Quaternion;

// get oriented bounding box of tile
const builder = new GlobeTileBuilder({ uvCount: 1 });
const size = new THREE.Vector3();
const dimension = new THREE.Vector2();
const center = new THREE.Vector3();
const coord = new Coordinates('EPSG:4326', 0, 0, 0);
let _obb: OBB;

const orientUtilsCache: Record<ProjectionLike, Record<ProjectionLike, QuaternionFunction>> = {};
function quaternionFromCRSToCRS(crsIn: ProjectionLike, crsOut: ProjectionLike): QuaternionFunction {
    if (!orientUtilsCache[crsIn]) {
        orientUtilsCache[crsIn] = {};
    }

    if (!orientUtilsCache[crsIn][crsOut]) {
        orientUtilsCache[crsIn][crsOut] = OrientationUtils.quaternionFromCRSToCRS(crsIn, crsOut);
    }

    return orientUtilsCache[crsIn][crsOut];
}

// it could be considered to remove THREE.Object3D extend.
/**
 * Represents an oriented bounding box.
 */
class OBB extends THREE.Object3D {
    box3D: THREE.Box3;
    natBox: THREE.Box3;
    z: { min: number, max: number, scale: number, delta: number };

    private _center: undefined | THREE.Vector3;
    matrixWorldInverse: THREE.Matrix4;

    /**
     * @param min - (optional) A {@link THREE.Vector3} representing the lower
     * (x, y, z) boundary of the box.
     * Default is ( + Infinity, + Infinity, + Infinity ).
     * @param max - (optional) A {@link THREE.Vector3} representing the upper
     * (x, y, z) boundary of the box.
     * Default is ( - Infinity, - Infinity, - Infinity ).
     */
    constructor(
        min = new THREE.Vector3(+Infinity, +Infinity, +Infinity),
        max = new THREE.Vector3(-Infinity, -Infinity, -Infinity),
    ) {
        super();
        this.natBox = new THREE.Box3(min.clone(), max.clone());
        this.box3D = this.natBox.clone();
        this.z = { min: 0, max: 0, scale: 1.0, delta: 0 };
        this.matrixWorldInverse = this.matrixWorld.clone().invert();
    }

    get center(): THREE.Vector3 {
        if (this._center != undefined) { return this._center; }
        const centerBbox = new THREE.Vector3();
        this.box3D.getCenter(centerBbox);
        this._center = centerBbox.applyMatrix4(this.matrix);
        return this._center;
    }

    override updateMatrixWorld(force?: boolean) {
        const matrixWorldInverseNeedsUpdate = this.matrixAutoUpdate || this.matrixWorldNeedsUpdate;
        super.updateMatrixWorld(force);
        if (matrixWorldInverseNeedsUpdate || force) {
            this.matrixWorldInverse = this.matrixWorld.clone().invert();
        }
    }

    /**
     * Copies the property from cOBB to this OBB.
     *
     * @param cOBB - OBB to copy
     */
    override copy(cOBB: OBB): this {
        super.copy(cOBB);
        this.box3D.copy(cOBB.box3D);
        this.natBox.copy(cOBB.natBox);
        this.z.min = cOBB.z.min;
        this.z.max = cOBB.z.max;
        this.z.scale = cOBB.z.scale;
        return this;
    }

    /**
     * Updates the z min, z max and z scale of oriented bounding box.
     *
     * @param elevation - Elevation parameters
     */
    updateZ(elevation: { min?: number, max?: number, scale?: number, geoidHeight?: number } = {}) {
        this.z.min = elevation.min ?? this.z.min;
        this.z.max = elevation.max ?? this.z.max;

        this.z.scale = elevation.scale && elevation.scale > 0 ? elevation.scale : this.z.scale;
        this.z.delta = Math.abs(this.z.max - this.z.min) * this.z.scale;

        // TODO: why not add the geoid height to the min and max parameters?
        // The implementation of GeoidLayer is leaking here.
        // This will be fixed when geoid layers will be considered as elevation
        // layers.
        const geoidHeight = elevation.geoidHeight || 0;

        this.box3D.min.z = this.natBox.min.z + this.z.min * this.z.scale + geoidHeight;
        this.box3D.max.z = this.natBox.max.z + this.z.max * this.z.scale + geoidHeight;
    }

    intersectsFrustum(frustum: THREE.Frustum): boolean {
        this.updateMatrixWorld(true);

        const invMatrix = this.matrixWorldInverse;

        const min = this.box3D.min;
        const max = this.box3D.max;

        const center = new THREE.Vector3()
            .addVectors(min, max)
            .multiplyScalar(0.5);

        const extents = new THREE.Vector3()
            .subVectors(max, min)
            .multiplyScalar(0.5);

        const localPlane = new THREE.Plane();
        const localNormal = new THREE.Vector3();

        for (let i = 0; i < 6; i++) {
            localPlane.copy(frustum.planes[i]).applyMatrix4(invMatrix);

            localNormal.copy(localPlane.normal);
            localNormal.set(
                Math.abs(localNormal.x),
                Math.abs(localNormal.y),
                Math.abs(localNormal.z),
            );

            const r =
                extents.x * localNormal.x +
                extents.y * localNormal.y +
                extents.z * localNormal.z;

            const d = localPlane.distanceToPoint(center);

            if (d + r < 0) {
                return false;
            }
        }

        return true;
    }

    getBoundingSphere(sphere: THREE.Sphere = new THREE.Sphere()): THREE.Sphere {
        const min = this.box3D.min;
        const max = this.box3D.max;

        // 8 corners of the box in local space
        const points = [
            new THREE.Vector3(min.x, min.y, min.z),
            new THREE.Vector3(min.x, min.y, max.z),
            new THREE.Vector3(min.x, max.y, min.z),
            new THREE.Vector3(min.x, max.y, max.z),
            new THREE.Vector3(max.x, min.y, min.z),
            new THREE.Vector3(max.x, min.y, max.z),
            new THREE.Vector3(max.x, max.y, min.z),
            new THREE.Vector3(max.x, max.y, max.z),
        ];

        // Temporary world-space AABB
        const worldBox = new THREE.Box3();
        worldBox.makeEmpty();

        for (const p of points) {
            p.applyMatrix4(this.matrixWorld);
            worldBox.expandByPoint(p);
        }

        worldBox.getBoundingSphere(sphere);
        return sphere;
    }

    /**
     * Determines if the sphere is above the XY space of the box.
     *
     * @param sphere - The sphere
     * @returns true if the sphere is above the XY space of the box, false
     * otherwise.
     */
    isSphereAboveXYBox(sphere: THREE.Sphere): boolean {
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
     * Computes the OBB from an extent.
     * The OBB resulted can be only in the system 'EPSG:3946'.
     *
     * @param extent - The extent (with crs 'EPSG:4326') to compute oriented
     * bounding box
     * @param minHeight - The minimum height of OBB
     * @param maxHeight - The maximum height of OBB
     * @returns return this object
     */
    setFromExtent(extent: Extent, minHeight = 0, maxHeight = 0): this {
        if (extent.crs == 'EPSG:4326') {
            const {
                shareableExtent,
                quaternion,
                position,
            } = builder.computeShareableExtent(extent);
            // Compute the minimum count of segment to build tile
            const segments = Math.max(
                Math.floor(shareableExtent.planarDimensions(dimension).x / 90 + 1),
                2,
            );
            const paramsGeometry = {
                extent: shareableExtent,
                level: 0,
                segments,
                disableSkirt: true,
            };

            const geometry = new TileGeometry(builder, paramsGeometry);
            if (geometry.boundingBox) {
                _obb.box3D.copy(geometry.boundingBox);
                _obb.natBox.copy(geometry.boundingBox);
                this.copy(_obb);
            }

            this.updateZ({ min: minHeight, max: maxHeight });
            this.position.copy(position);
            this.quaternion.copy(quaternion);
            this.updateMatrixWorld(true);
        } else if (CRS.isMetricUnit(extent.crs)) {
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

    setFromBox3(box3: THREE.Box3) {
        this.natBox.copy(box3);
        this.box3D = this.natBox.clone();
        return this;
    }

    setFromArray(array: number[]) {
        this.natBox.setFromArray(array);
        this.box3D = this.natBox.clone();
        return this;
    }

    /**
     * Project the OBB in a specified crs.
     * The OBB new position will be the initial OBB center
     * projected at z=0 in the initial crs.
     *
     * @param crsIn - The initial crs (at the creation of the OBB)
     * @param crsOut - The crs in which we want the obb to be projected
     */
    projOBB(crsIn: ProjectionLike, crsOut: ProjectionLike) {
        let forward = ((coord: [number, number, number]) => coord);
        if (crsIn !== crsOut) {
            try {
                forward = CRS.transform(crsIn, crsOut).forward;
            } catch (err) {
                throw new Error(`${err} is not defined in proj4`);
            }
        }

        const { min, max } = this.natBox;
        const corners = [
            ...forward([max.x, max.y, max.z]),
            ...forward([min.x, max.y, max.z]),
            ...forward([min.x, min.y, max.z]),
            ...forward([max.x, min.y, max.z]),
            ...forward([max.x, max.y, min.z]),
            ...forward([min.x, max.y, min.z]),
            ...forward([min.x, min.y, min.z]),
            ...forward([max.x, min.y, min.z]),
        ];

        // get center of box at altitude Z=0 and project it in view crs;
        const origin = forward([(min.x + max.x) * 0.5, (min.y + max.y) * 0.5, 0]);

        // get LocalRotation
        const isGeocentric = proj4.defs(crsOut).projName === 'geocent';
        let quaternion = new THREE.Quaternion();
        if (isGeocentric) {
            const coordOrigin = new Coordinates(crsOut).setFromArray(origin);
            quaternion = quaternionFromCRSToCRS(crsOut, crsIn)(coordOrigin);
        }

        // project corners in local referentiel
        const cornersLocal = [];
        for (let i = 0; i < 24; i += 3) {
            const cornerLocal = new THREE.Vector3(
                corners[i] - origin[0],
                corners[i + 1] - origin[1],
                corners[i + 2] - origin[2],
            );
            cornerLocal.applyQuaternion(quaternion);
            cornersLocal.push(...cornerLocal.toArray());
        }

        this.box3D.setFromArray(cornersLocal);
        this.position.fromArray(origin);
        this.quaternion.copy(quaternion).invert();

        this.updateMatrix();
        this.updateMatrixWorld();

        // reset center
        this._center = undefined;
    }
    /**
     * Clamped the OBB on the z axes of the OBB.box3D.
     *
     * @param zmin - The min z value for clamping.
     * @param zmax - the max z value for clamping.
     */
    clampZ(zmin: number, zmax: number) {
        const clampBBox = this.box3D;
        if (clampBBox.min.z < zmax) {
            clampBBox.max.z = Math.min(clampBBox.max.z, zmax);
        }
        if (clampBBox.max.z > zmin) {
            clampBBox.min.z = Math.max(clampBBox.min.z, zmin);
        }
    }
}

_obb = new OBB();

export default OBB;
