import * as THREE from 'three';

import TiledGeometryLayer from '../../../Layer/TiledGeometryLayer';
import Extent from '../../Geographic/Extent';
import { panoramaCulling, panoramaSubdivisionControl } from '../../../Process/PanoramaTileProcessing';
import PanoramaTileBuilder from './PanoramaTileBuilder';
import ProjectionType from './Constants';

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

        this.culling = panoramaCulling;
        this.subdivision = panoramaSubdivisionControl(
            config.maxSubdivisionLevel || 10,
            new THREE.Vector2(512, 256));

        this.options.segments = 8;
        this.options.quality = 0.5;
    }
}

export default PanoramaLayer;
