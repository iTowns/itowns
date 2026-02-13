import * as THREE from 'three';
import TiledGeometryLayer from 'Layer/TiledGeometryLayer';
import { Coordinates, ellipsoidSizes } from '@itowns/geographic';
import { globalExtentTMS, schemeTiles } from 'Core/Tile/TileGrid';
import { GlobeTileBuilder } from 'Core/Prefab/Globe/GlobeTileBuilder';

// vectors for operation purpose
const scaledHorizonCullingPoint = new THREE.Vector3();

/**
 * @property {boolean} isGlobeLayer - Used to checkout whether this layer is a
 * GlobeLayer. Default is true. You should not change this, as it is used
 * internally for optimisation.
 *
 * @extends TiledGeometryLayer
 */
class GlobeLayer extends TiledGeometryLayer {
    /**
     * A {@link TiledGeometryLayer} to use with a {@link GlobeView}. It has
     * specific method for updating and subdivising its grid.
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {THREE.Object3D} [object3d=THREE.Group] - The object3d used to
     * contain the geometry of the TiledGeometryLayer. It is usually a
     * `THREE.Group`, but it can be anything inheriting from a `THREE.Object3d`.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name.
     * @param {number} [config.minSubdivisionLevel=2] - Minimum subdivision
     * level for this tiled layer.
     * @param {number} [config.maxSubdivisionLevel=18] - Maximum subdivision
     * level for this tiled layer.
     * @param {number} [config.sseSubdivisionThreshold=1] - Threshold level for
     * the SSE.
     *
     * @throws {Error} `object3d` must be a valid `THREE.Object3d`.
     */
    constructor(id, object3d, config = {}) {
        const {
            minSubdivisionLevel = 2,
            maxSubdivisionLevel = 19,
            ...tiledConfig
        } = config;

        // Configure tiles
        const scheme = schemeTiles.get('EPSG:4326');
        const schemeTile = globalExtentTMS.get('EPSG:4326').subdivisionByScheme(scheme);

        // Supported tile matrix set for color/elevation layer
        const tileMatrixSets = [
            'EPSG:4326',
            'EPSG:3857',
        ];

        const uvCount = tileMatrixSets.length;
        const builder = new GlobeTileBuilder({ uvCount });

        super(id, object3d || new THREE.Group(), schemeTile, builder, {
            tileMatrixSets,
            ...tiledConfig,
        });

        this.isGlobeLayer = true;
        this.options.defaultPickingRadius = 5;
        this.minSubdivisionLevel = minSubdivisionLevel;
        this.maxSubdivisionLevel = maxSubdivisionLevel;

        this.extent = this.schemeTile[0].clone();

        for (let i = 1; i < this.schemeTile.length; i++) {
            this.extent.union(this.schemeTile[i]);
        }

        // We're going to use the method described here:
        //    https://cesiumjs.org/2013/04/25/Horizon-culling/
        // This method assumes that the globe is a unit sphere at 0,0,0 so
        // we setup a world-to-scaled-ellipsoid matrix4
        this.worldToScaledEllipsoid = new THREE.Matrix4();
        this.worldToScaledEllipsoid.copy(this.object3d.matrixWorld).invert();
        this.worldToScaledEllipsoid.premultiply(
            new THREE.Matrix4().makeScale(
                1 / ellipsoidSizes.x,
                1 / ellipsoidSizes.y,
                1 / ellipsoidSizes.z));

        // camera's position and magnitude in worldToScaledEllipsoid system
        this._cameraPosition = new THREE.Vector3();
        this._magnitudeSquared = 0.0;
    }

    preUpdate(context, changeSources) {
        // pre-horizon culling
        this._cameraPosition.copy(context.camera.camera3D.position).applyMatrix4(this.worldToScaledEllipsoid);

        const horizonScaleFactor = context.view.horizonScaleFactor;
        if (horizonScaleFactor < 1) {
            // Computing a scaling factor to apply to camera position to scale horizon distance linearly :
            // actual horizon * horizon scale factor = scaled camera horizon
            // See horizon culling formula and Cesium culling method documentation
            const cameraLengthSquared = this._cameraPosition.lengthSq();
            const targetLengthSquared = horizonScaleFactor * horizonScaleFactor * (cameraLengthSquared - 1) + 1;
            const cameraScaleFactor = Math.sqrt(targetLengthSquared / cameraLengthSquared);
            this._cameraPosition.multiplyScalar(cameraScaleFactor);
        }
        this._magnitudeSquared = this._cameraPosition.lengthSq() - 1.0;

        return super.preUpdate(context, changeSources);
    }

    subdivision(context, layer, node) {
        if (node.level == 5) {
            const row = node.getExtentsByProjection('EPSG:4326')[0].row;
            if (row == 31 || row == 0) {
                // doesn't subdivise the pole
                return false;
            }
        }
        return super.subdivision(context, layer, node);
    }

    culling(node, camera) {
        if (super.culling(node, camera)) {
            return true;
        }

        if (node.level < this.minSubdivisionLevel) {
            return false;
        }

        return this.horizonCulling(node.horizonCullingPointElevationScaled);
    }

    /**
     * Compute the occlusion of a point by the globe.
     * See {@link https://cesiumjs.org/2013/04/25/Horizon-culling/}.
     *
     * @param {THREE.Vector3} point - The point to check for occlusion (in world coordinates).
     * @returns {boolean} True if the point is occluded by the globe, false otherwise.
     */
    horizonCulling(point) {
        // see https://cesiumjs.org/2013/04/25/Horizon-culling/
        scaledHorizonCullingPoint.copy(point).applyMatrix4(this.worldToScaledEllipsoid);
        scaledHorizonCullingPoint.sub(this._cameraPosition);

        const vtMagnitudeSquared = scaledHorizonCullingPoint.lengthSq();
        const dot = -scaledHorizonCullingPoint.dot(this._cameraPosition);
        const isOccluded = this._magnitudeSquared < 0 ? dot > 0
            : this._magnitudeSquared < dot && this._magnitudeSquared < ((dot * dot) / vtMagnitudeSquared);

        return isOccluded;
    }

    computeTileZoomFromDistanceCamera(distance, camera) {
        const preSinus =
            this.sizeDiagonalTexture * (this.sseSubdivisionThreshold * 0.5) / camera._preSSE / ellipsoidSizes.x;

        let sinus = distance * preSinus;
        let zoom = Math.log(Math.PI / (2.0 * Math.asin(sinus))) / Math.log(2);

        const delta = Math.PI / 2 ** zoom;
        const circleChord = 2.0 * ellipsoidSizes.x * Math.sin(delta * 0.5);
        const radius = circleChord * 0.5;

        // adjust with bounding sphere rayon
        sinus = (distance - radius) * preSinus;
        zoom = Math.log(Math.PI / (2.0 * Math.asin(sinus))) / Math.log(2);

        return isNaN(zoom) ? 0 : Math.round(zoom);
    }

    computeDistanceCameraFromTileZoom(zoom, camera) {
        const delta = Math.PI / 2 ** zoom;
        const circleChord = 2.0 * ellipsoidSizes.x * Math.sin(delta * 0.5);
        const radius = circleChord * 0.5;
        const error = radius / this.sizeDiagonalTexture;

        return camera._preSSE * error / (this.sseSubdivisionThreshold * 0.5) + radius;
    }
}

export default GlobeLayer;
