import * as THREE from 'three';
import TiledGeometryLayer from 'Layer/TiledGeometryLayer';
import { ellipsoidSizes } from '@itowns/geographic';
import { globalExtentTMS, schemeTiles } from 'Core/Tile/TileGrid';
import { GlobeTileBuilder } from 'Core/Prefab/Globe/GlobeTileBuilder';

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
     * @param {object} [config] - Optional configuration, all elements in it
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

        // matrix to convert sphere to ellipsoid
        this._worldToScaledEllipsoid = new THREE.Matrix4();
        // camera's position in worldToScaledEllipsoid system
        this._cameraPosition = new THREE.Vector3();
        this._magnitudeSquared = 0.0;
        this._useFarCulling = false;
        this._horizonDistance = 0.0;

        // vectors for operation purpose
        this._cullingPoint = new THREE.Vector3();
        this._cameraForward = new THREE.Vector3();
        this._cameraToPoint = new THREE.Vector3();

        this.extent = this.schemeTile[0].clone();

        for (let i = 1; i < this.schemeTile.length; i++) {
            this.extent.union(this.schemeTile[i]);
        }

        // We're going to use the method described here:
        //    https://cesiumjs.org/2013/04/25/Horizon-culling/
        // This method assumes that the globe is a unit sphere at 0,0,0 so
        // we setup a world-to-scaled-ellipsoid matrix4
        this._worldToScaledEllipsoid.copy(this.object3d.matrixWorld).invert();
        this._worldToScaledEllipsoid.premultiply(
            new THREE.Matrix4().makeScale(
                1 / ellipsoidSizes.x,
                1 / ellipsoidSizes.y,
                1 / ellipsoidSizes.z));
    }

    preUpdate(context, changeSources) {
        this._useFarCulling = context.view.horizonScaleFactor < 1;
        if (!this._useFarCulling) {
            // pre-horizon culling
            this._cameraPosition.copy(context.camera.camera3D.position).applyMatrix4(this._worldToScaledEllipsoid);
            this._magnitudeSquared = this._cameraPosition.lengthSq() - 1.0;
        } else {
            // pre-far culling
            this._horizonDistance = context.view.horizonDistance;
            // Store camera forward direction in world space.
            context.camera.camera3D.getWorldDirection(this._cameraForward);
        }
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

        if (this._useFarCulling) {
            return this.farCulling(node, camera);
        } else {
            return this.horizonCulling(node.horizonCullingPointElevationScaled);
        }
    }

    horizonCulling(point) {
        // see https://cesiumjs.org/2013/04/25/Horizon-culling/
        this._cullingPoint.copy(point).applyMatrix4(this._worldToScaledEllipsoid);
        this._cullingPoint.sub(this._cameraPosition);

        const vtMagnitudeSquared = this._cullingPoint.lengthSq();
        const dot = -this._cullingPoint.dot(this._cameraPosition);
        const isOccluded = this._magnitudeSquared < 0 ? dot > 0
            : this._magnitudeSquared < dot && this._magnitudeSquared < ((dot * dot) / vtMagnitudeSquared);

        return isOccluded;
    }

    farCulling(node, camera) {
        // Transform bounding sphere center from local to world space.
        this._cullingPoint.copy(node.boundingSphere.center).applyMatrix4(node.matrixWorld);

        // Project the vector camera -> sphere center onto the camera axis.
        this._cameraToPoint.subVectors(this._cullingPoint, camera.camera3D.position);
        const projectedDistance = this._cameraToPoint.dot(this._cameraForward);

        // Cull only if the whole bounding sphere is beyond the far plane.
        return projectedDistance - node.boundingSphere.radius > this._horizonDistance;
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
