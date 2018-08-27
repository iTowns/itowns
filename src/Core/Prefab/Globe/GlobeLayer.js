import * as THREE from 'three';

import TiledGeometryLayer from '../../../Layer/TiledGeometryLayer';
import { ellipsoidSizes } from '../../Geographic/Coordinates';
import Extent from '../../Geographic/Extent';
import BuilderEllipsoidTile from './BuilderEllipsoidTile';
import { l_ELEVATION } from '../../../Renderer/LayeredMaterialConstants';
import { SIZE_TEXTURE_TILE } from '../../../Provider/OGCWebServiceHelper';

// matrix to convert sphere to ellipsoid
const worldToScaledEllipsoid = new THREE.Matrix4();
// camera's position in worldToScaledEllipsoid system
const cameraPosition = new THREE.Vector3();
let magnitudeSquared = 0.0;

// vectors for operation purpose
const cullingVector = new THREE.Vector3();
const subdivisionVector = new THREE.Vector3();
const boundingSphereCenter = new THREE.Vector3();

// subdivison ratio
let subdivisionRatio = 0;

class GlobeLayer extends TiledGeometryLayer {
    /**
     * A {@link TiledGeometryLayer} to use with a {@link GlobeView}. It has
     * specific method for updating and subdivising its grid.
     *
     * @constructor
     * @extends TiledGeometryLayer
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {THREE.Object3d} [object3d=THREE.Group] - The object3d used to
     * contain the geometry of the TiledGeometryLayer. It is usually a
     * <code>THREE.Group</code>, but it can be anything inheriting from a
     * <code>THREE.Object3d</code>.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements <code>name, protocol, extent</code>, these
     * elements will be available using <code>layer.name</code> or something
     * else depending on the property name.
     * @param {number} [config.minSubdivisionLevel=2] - Minimum subdivision
     * level for this tiled layer.
     * @param {number} [config.maxSubdivisionLevel=18] - Maximum subdivision
     * level for this tiled layer.
     * @param {number} [config.sseSubdivisionThreshold=1] - Threshold level for
     * the SSE.
     * @param {number} [config.maxDeltaElevationLevel=4] - Maximum delta between
     * two elevations tile.
     *
     * @throws {Error} <code>object3d</code> must be a valid
     * <code>THREE.Object3d</code>.
     */
    constructor(id, object3d, config = {}) {
        // Configure tiles
        const schemeTile = [
            new Extent('EPSG:4326', -180, 0, -90, 90),
            new Extent('EPSG:4326', 0, 180, -90, 90)];
        const builder = new BuilderEllipsoidTile();

        super(id, object3d || new THREE.Group(), schemeTile, builder, config);

        this.options.defaultPickingRadius = 5;
        this.minSubdivisionLevel = this.minSubdivisionLevel || 2.0;
        this.maxSubdivisionLevel = this.maxSubdivisionLevel || 18.0;
        this.sseSubdivisionThreshold = this.sseSubdivisionThreshold || 1.0;
        this.maxDeltaElevation = this.maxDeltaElevation || 4.0;

        this.extent = this.schemeTile[0].clone();

        for (let i = 1; i < this.schemeTile.length; i++) {
            this.extent.union(this.schemeTile[i]);
        }

        // We're going to use the method described here:
        //    https://cesiumjs.org/2013/04/25/Horizon-culling/
        // This method assumes that the globe is a unit sphere at 0,0,0 so
        // we setup a world-to-scaled-ellipsoid matrix4
        worldToScaledEllipsoid.getInverse(this.object3d.matrixWorld);
        worldToScaledEllipsoid.premultiply(
            new THREE.Matrix4().makeScale(
                1 / ellipsoidSizes.x,
                1 / ellipsoidSizes.y,
                1 / ellipsoidSizes.z));

        subdivisionRatio = 1 / Math.pow(2, this.maxDeltaElevationLevel);
    }

    preUpdate(context, changeSources) {
        // pre-horizon culling
        cameraPosition.copy(context.camera.camera3D.position).applyMatrix4(worldToScaledEllipsoid);
        magnitudeSquared = cameraPosition.lengthSq() - 1.0;

        // pre-sse
        const canvasSize = context.view.mainLoop.gfxEngine.getWindowSize();
        const hypothenuse = canvasSize.length();
        const radAngle = context.view.camera.camera3D.fov * Math.PI / 180;
        const HYFOV = 2.0 * Math.atan(Math.tan(radAngle * 0.5) * hypothenuse / canvasSize.x);
        context.camera.preSSE = hypothenuse * (2.0 * Math.tan(HYFOV * 0.5));

        // Leaving the correct SSE below to be added later, as it is too heavy for now.
        // const FOV = THREE.Math.degToRad(context.camera.camera3D.fov);
        // context.camera.preSSE = context.camera.height / (2.0 * Math.tan(FOV * 0.5));

        return super.preUpdate(context, changeSources);
    }

    // eslint-disable-next-line class-methods-use-this
    countColorLayersTextures(...layers) {
        let occupancy = 0;
        for (const layer of layers) {
            const projection = layer.projection || layer.source.projection;
            // 'EPSG:3857' occupies the maximum 3 textures on tiles
            // 'EPSG:4326' occupies 1 textures on tile
            occupancy += projection == 'EPSG:3857' ? 3 : 1;
        }
        return occupancy;
    }

    // eslint-disable-next-line
    culling(node, camera) {
        if (!camera.isBox3Visible(node.OBB().box3D, node.OBB().matrixWorld)) {
            return true;
        }

        if (node.level < this.minSubdivisionLevel) {
            return false;
        }

        const points = node.OBB().topPointsWorld;

        for (const point of points) {
            // see https://cesiumjs.org/2013/04/25/Horizon-culling/
            cullingVector.copy(point);
            cullingVector.applyMatrix4(worldToScaledEllipsoid).sub(cameraPosition);

            const vtMagnitudeSquared = cullingVector.lengthSq();
            const dot = -cullingVector.dot(cameraPosition);
            const isOccluded = magnitudeSquared < dot && magnitudeSquared < ((dot * dot) / vtMagnitudeSquared);

            if (!isOccluded) {
                return false;
            }
        }

        return true;
    }

    /**
     * Test the subdvision of a node, compared to this layer.
     *
     * @param {Object} context - The context of the update; see the {@link
     * MainLoop} for more informations.
     * @param {GlobeLayer} layer - This layer, parameter to be removed.
     * @param {TileMesh} node - The node to test.
     *
     * @return {boolean} - True if the node is subdivisable, otherwise false.
     */
    subdivision(context, layer, node) {
        if (node.level < this.minSubdivisionLevel) {
            return true;
        }

        if (this.maxSubdivisionLevel <= node.level) {
            return false;
        }

        // Prevent to subdivise the node if the current elevation level
        // we must avoid a tile, with level 20, inherits a level 3 elevation texture.
        // The induced geometric error is much too large and distorts the SSE
        const currentTexture = node.material.textures[l_ELEVATION][0];
        if (currentTexture.extent) {
            const offsetScale = node.material.offsetScale[l_ELEVATION][0];
            const ratio = offsetScale.z;
            // ratio is node size / texture size
            if (ratio < subdivisionRatio) {
                return false;
            }
        }

        subdivisionVector.setFromMatrixScale(node.matrixWorld);
        boundingSphereCenter.copy(node.boundingSphere.center).applyMatrix4(node.matrixWorld);
        const distance = Math.max(
            0.0,
            context.camera.camera3D.position.distanceTo(boundingSphereCenter) - node.boundingSphere.radius * subdivisionVector.x);

        // TODO: node.geometricError is computed using a hardcoded 18 level
        // The computation of node.geometricError is surely false
        const sse = context.camera.preSSE * (node.geometricError * subdivisionVector.x) / distance;

        return this.sseSubdivisionThreshold < sse;
    }

    computeTileZoomFromDistanceCamera(distance, camera) {
        const preSinus =
            SIZE_TEXTURE_TILE * (this.sseSubdivisionThreshold * 0.5) / camera.preSSE / ellipsoidSizes.x;

        let sinus = distance * preSinus;
        let zoom = Math.log(Math.PI / (2.0 * Math.asin(sinus))) / Math.log(2);

        const delta = Math.PI / Math.pow(2, zoom);
        const circleChord = 2.0 * ellipsoidSizes.x * Math.sin(delta * 0.5);
        const radius = circleChord * 0.5;

        // adjust with bounding sphere rayon
        sinus = (distance - radius) * preSinus;
        zoom = Math.log(Math.PI / (2.0 * Math.asin(sinus))) / Math.log(2);

        return isNaN(zoom) ? 0 : Math.round(zoom);
    }

    computeDistanceCameraFromTileZoom(zoom, camera) {
        const delta = Math.PI / Math.pow(2, zoom);
        const circleChord = 2.0 * ellipsoidSizes.x * Math.sin(delta * 0.5);
        const radius = circleChord * 0.5;
        const error = radius / SIZE_TEXTURE_TILE;

        return camera.preSSE * error / (this.sseSubdivisionThreshold * 0.5) + radius;
    }
}

export default GlobeLayer;
