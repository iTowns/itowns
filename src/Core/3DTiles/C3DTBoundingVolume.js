import * as THREE from 'three';
import Ellipsoid from 'Core/Math/Ellipsoid';
import Coordinates from '../Geographic/Coordinates';
import { C3DTilesTypes, C3DTilesBoundingVolumeTypes } from './C3DTilesEnums';

const ellipsoid = new Ellipsoid();

// bounding box scratch variables
const boxSize = new THREE.Vector3();
const boxCenter = new THREE.Vector3();

// Bounding region scratch variables
const southEastUpCarto = new Coordinates('EPSG:4326');
const southEastUpVec3 = new THREE.Vector3();
const northWestBottomCarto = new Coordinates('EPSG:4326');
const northWestBottomVec3 = new THREE.Vector3();
const radiusScratch = new THREE.Vector3();

// Culling scratch value
const worldCoordinateCenter = new THREE.Vector3();

/**
 * Bounding region is converted to a bounding sphere to simplify and speed computation and culling. This function
 * computes a sphere enclosing the bounding region.
 * @param {Object} region - the parsed json from the tile representing the region
 * @param {THREE.Matrix4} tileMatrixInverse - the inverse transformation matrix of the tile to transform the produced
 * sphere from a global to a reference local to the tile
 * @return {THREE.Sphere} a sphere enclosing the given region
 */
function initFromRegion(region, tileMatrixInverse) {
    const east = region[2];
    const west = region[0];
    const south = region[1];
    const north = region[3];
    const minHeight = region[4];
    const maxHeight = region[5];

    const eastDeg = THREE.MathUtils.radToDeg(east);
    const westDeg = THREE.MathUtils.radToDeg(west);
    const southDeg = THREE.MathUtils.radToDeg(south);
    const northDeg = THREE.MathUtils.radToDeg(north);

    northWestBottomCarto.setFromValues(westDeg, northDeg, minHeight);
    ellipsoid.cartographicToCartesian(northWestBottomCarto, northWestBottomVec3);

    southEastUpCarto.setFromValues(eastDeg, southDeg, maxHeight);
    ellipsoid.cartographicToCartesian(southEastUpCarto, southEastUpVec3);

    const regionCenter = new THREE.Vector3();
    regionCenter.lerpVectors(northWestBottomVec3, southEastUpVec3, 0.5);
    const radius = radiusScratch.subVectors(northWestBottomVec3, southEastUpVec3).length() / 2;

    const sphere = new THREE.Sphere(regionCenter, radius);
    sphere.applyMatrix4(tileMatrixInverse);

    return sphere;
}

/**
 * Create a bounding box from a json describing a box in a 3D Tiles tile.
 * @param {Object} box - the parsed json from the tile representing the box
 * @return {THREE.Box3} the bounding box of the tile
 */
function initFromBox(box) {
    // box[0], box[1], box[2] = center of the box
    // box[3], box[4], box[5] = x axis direction and half-length
    // box[6], box[7], box[8] = y axis direction and half-length
    // box[9], box[10], box[11] = z axis direction and half-length
    boxCenter.set(box[0], box[1], box[2]);
    boxSize.set(box[3], box[7], box[11]).multiplyScalar(2);
    const box3 = new THREE.Box3();
    box3.setFromCenterAndSize(boxCenter, boxSize);
    return box3;
}

/**
 * Creats a bounding sphere from a json describing a sphere in a 3D Tiles tile.
 * @param {Object} sphere - the parsed json from the tile representing the sphere
 * @returns {THREE.Sphere} the bounding sphere of the tile
 */
function initFromSphere(sphere) {
    const sphereCenter = new THREE.Vector3();
    sphereCenter.set(sphere[0], sphere[1], sphere[2]);
    return new THREE.Sphere(sphereCenter, sphere[3]);
}

/**
 * [bounding volume](https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/specification/schema/boundingVolume.schema.json)
 * Used to represent bounding volumes and viewer request volumes. The input bounding volume (from the dataset) can be a
 * box, a sphere or a region. Regions are transformed to spheres internally for simplification of parsing and to speed
 * up computations such as culling.
 * @property {C3DTilesTypes} type - Used by 3D Tiles extensions
 * (e.g. {@link C3DTBatchTableHierarchyExtension}) to know in which context
 * (i.e. for which 3D Tiles class) the parsing of the extension should be done.
 * @property {String} initialVolumeType - the initial volume type to be able to dissociate spheres
 * and regions if needed since both are converted to spheres (one of {@link C3DTilesBoundingVolumeTypes})
 * @property {THREE.Box3|THREE.Sphere} volume - The 3D bounding volume created. Can be a THREE.Box3 for bounding volumes
 * of types box or a THREE.Sphere for bounding volumes of type sphere or region.
 * @property {object} extensions - 3D Tiles extensions of the bounding volume
 * stored in the following format:
 * {extensioName1: extensionObject1, extensioName2: extensionObject2, ...}
 */
class C3DTBoundingVolume {
    constructor(json, tileMatrixInverse, registeredExtensions) {
        this.type = C3DTilesTypes.boundingVolume;

        if (json.region) {
            this.initialVolumeType = C3DTilesBoundingVolumeTypes.region;
            this.volume = initFromRegion(json.region, tileMatrixInverse);
        } else if (json.box) {
            this.initialVolumeType = C3DTilesBoundingVolumeTypes.box;
            this.volume = initFromBox(json.box);
        } else if (json.sphere) {
            this.initialVolumeType = C3DTilesBoundingVolumeTypes.sphere;
            this.volume = initFromSphere(json.sphere);
        } else {
            throw new Error(`Unknown bounding volume type: ${json}. 3D Tiles nodes must have a bounding volume of type
            region, box or sphere.`);
        }

        if (json.extensions) {
            this.extensions =
                registeredExtensions.parseExtensions(json.extensions, this.type);
        }
    }

    /**
     * Performs camera frustum culling on bounding volumes.
     * @param {Camera} camera - the camera to perform culling for
     * @param {THREE.Matrix4} tileMatrixWorld - the world matrix of the tile
     * @returns {boolean} true if the tile should be culled out (bounding volume not in camera frustum), false otherwise.
     */
    boundingVolumeCulling(camera, tileMatrixWorld) {
        if (this.initialVolumeType === C3DTilesBoundingVolumeTypes.box) {
            return !camera.isBox3Visible(this.volume, tileMatrixWorld);
        } else if (this.initialVolumeType === C3DTilesBoundingVolumeTypes.sphere ||
                   this.initialVolumeType === C3DTilesBoundingVolumeTypes.region) {
            return !camera.isSphereVisible(this.volume, tileMatrixWorld);
        } else {
            throw new Error('Unknown bounding volume type.');
        }
    }

    /**
     * Checks if the camera is inside the [viewer request volumes](https://github.com/CesiumGS/3d-tiles/tree/main/specification#viewer-request-volume).
     * @param {Camera} camera - the camera to perform culling for
     * @param {THREE.Matrix4} tileMatrixWorld - the world matrix of the tile
     * @returns {boolean} true if the camera is outside the viewer request volume, false otherwise.
     */
    viewerRequestVolumeCulling(camera, tileMatrixWorld) {
        if (this.initialVolumeType === C3DTilesBoundingVolumeTypes.region) {
            console.warn('Region viewerRequestVolume not yet supported');
            return true;
        }
        if (this.initialVolumeType === C3DTilesBoundingVolumeTypes.box) {
            console.warn('Bounding box viewerRequestVolume not yet supported');
            return true;
        }
        if (this.initialVolumeType === C3DTilesBoundingVolumeTypes.sphere) {
            worldCoordinateCenter.copy(this.volume.center);
            worldCoordinateCenter.applyMatrix4(tileMatrixWorld);
            // To check the distance between the center sphere and the camera
            return !(camera.camera3D.position.distanceTo(worldCoordinateCenter) <= this.volume.radius);
        }
        return false;
    }
}

export default C3DTBoundingVolume;
