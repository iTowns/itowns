import * as THREE from 'three';

import TiledGeometryLayer from 'Layer/TiledGeometryLayer';
import Extent from 'Core/Geographic/Extent';
import PanoramaTileBuilder from './PanoramaTileBuilder';
import ProjectionType from './Constants';

const textureSize = new THREE.Vector2(512, 256);
const center = new THREE.Vector3();

/**
 * @deprecated
 *
 * This layer is going to be removed after 2.7.0, along with StaticSource and
 * PanoramaView.
 *
 * See https://github.com/iTowns/itowns/issues/739
 * See https://github.com/iTowns/itowns/issues/901
 */
class PanoramaLayer extends TiledGeometryLayer {
    /**
     * A {@link TiledGeometryLayer} to use with a {@link PanoramaView}. It has
     * specific method for updating and subdivising its grid.
     *
     * @constructor
     * @extends TiledGeometryLayer
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {Coordinates} coordinates - The coordinates of the origin of the
     * panorama.
     * @param {number} type - The type of projection for the panorama: 1 for a
     * cylindrical projection, 2 for a spherical one.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements <code>name, protocol, extent</code>, these
     * elements will be available using <code>layer.name</code> or something
     * else depending on the property name.
     * @param {THREE.Object3d} [config.object3d=THREE.Group] - The object3d used to
     * contain the geometry of the TiledGeometryLayer. It is usually a
     * <code>THREE.Group</code>, but it can be anything inheriting from a
     * <code>THREE.Object3d</code>.
     * @param {number} [config.maxSubdivisionLevel=10] - Maximum subdivision
     * level for this tiled layer.
     * @param {number} [config.ratio=1] - Ratio for building the panorama
     * sphere.
     *
     * @throws {Error} <code>object3d</code> must be a valid
     * <code>THREE.Object3d</code>.
     */
    constructor(id, coordinates, type, config) {
        console.warn('Deprecation warning: this layer is going to be removed in iTowns 2.7.0, please consider stop using it.');
        let schemeTile;
        if (type === ProjectionType.SPHERICAL) {
            // equirectangular -> spherical geometry
            schemeTile = [
                new Extent('EPSG:4326', {
                    west: -180,
                    east: 0,
                    north: 90,
                    south: -90,
                }), new Extent('EPSG:4326', {
                    west: 0,
                    east: 180,
                    north: 90,
                    south: -90,
                })];
        } else if (type === ProjectionType.CYLINDRICAL) {
            // cylindrical geometry
            schemeTile = [
                new Extent('EPSG:4326', {
                    west: -180,
                    east: -90,
                    north: 90,
                    south: -90,
                }), new Extent('EPSG:4326', {
                    west: -90,
                    east: 0,
                    north: 90,
                    south: -90,
                }), new Extent('EPSG:4326', {
                    west: 0,
                    east: 90,
                    north: 90,
                    south: -90,
                }), new Extent('EPSG:4326', {
                    west: 90,
                    east: 180,
                    north: 90,
                    south: -90,
                })];
        } else {
            throw new Error(`Unsupported panorama projection type ${type}.
                Only ProjectionType.SPHERICAL and ProjectionType.CYLINDRICAL are supported`);
        }
        const builder = new PanoramaTileBuilder(type, config.ratio || 1);
        super(id, config.object3d || new THREE.Group(), schemeTile, builder, config);

        coordinates.xyz(this.object3d.position);
        this.object3d.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 0, 1), coordinates.geodesicNormal);
        this.object3d.updateMatrixWorld(true);

        // FIXME: add CRS = '0' support
        this.extent = new Extent('EPSG:4326', {
            west: -180,
            east: 180,
            north: 90,
            south: -90,
        });

        this.disableSkirt = true;

        this.options.segments = 8;
        this.options.quality = 0.5;
    }

    // eslint-disable-next-line
    culling(node, camera) {
        return !camera.isBox3Visible(node.obb.box3D, node.obb.matrixWorld);
    }

    /**
     * Test the subdvision of a node, compared to this layer.
     *
     * @param {Object} context - The context of the update; see the {@link
     * MainLoop} for more informations.
     * @param {PlanarLayer} layer - This layer, parameter to be removed.
     * @param {TileMesh} node - The node to test.
     *
     * @return {boolean} - True if the node is subdivisable, otherwise false.
     */
    subdivision(context, layer, node) {
        if (node.level < 1) {
            return true;
        }

        const maxLevel = this.maxSubdivisionLevel || 10;

        if (maxLevel <= node.level) {
            return false;
        }

        const obb = node.obb;

        obb.updateMatrixWorld();
        const onScreen = context.camera.box3SizeOnScreen(
            obb.box3D,
            obb.matrixWorld);

        onScreen.min.z = 0;
        onScreen.max.z = 0;
        onScreen.getCenter(center);

        // give a small boost to central tiles
        const boost = 1 + Math.max(0, 1 - center.length());

        const dim = {
            x: 0.5 * (onScreen.max.x - onScreen.min.x) * context.camera.width,
            y: 0.5 * (onScreen.max.y - onScreen.min.y) * context.camera.height,
        };

        const quality = layer.options.quality || 1.0;
        return (boost * dim.x * quality >= textureSize.x && boost * dim.y * quality >= textureSize.y);
    }
}

export default PanoramaLayer;
