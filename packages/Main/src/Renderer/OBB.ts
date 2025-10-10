import * as THREE from 'three';
import { TileGeometry } from 'Core/TileGeometry';
import { GlobeTileBuilder } from 'Core/Prefab/Globe/GlobeTileBuilder';
import { CRS, Coordinates } from '@itowns/geographic';

import type { Extent } from '@itowns/geographic';

// get oriented bounding box of tile
const builder = new GlobeTileBuilder({ uvCount: 1 });
const size = new THREE.Vector3();
const dimension = new THREE.Vector2();
const center = new THREE.Vector3();
const coord = new Coordinates('EPSG:4326', 0, 0, 0);
let _obb: OBB;

// it could be considered to remove THREE.Object3D extend.
/**
 * Represents an oriented bounding box.
 */
class OBB extends THREE.Object3D {
    box3D: THREE.Box3;
    natBox: THREE.Box3;
    z: { min: number, max: number, scale: number, delta: number };

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
        this.box3D = new THREE.Box3(min.clone(), max.clone());
        this.natBox = this.box3D.clone();
        this.z = { min: 0, max: 0, scale: 1.0, delta: 0 };
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
}

_obb = new OBB();

export default OBB;
