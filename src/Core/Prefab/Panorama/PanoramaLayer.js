import * as THREE from 'three';

import TiledGeometryLayer from '../../../Layer/TiledGeometryLayer';
import Extent from '../../Geographic/Extent';
import { processTiledGeometryNode } from '../../../Process/TiledNodeProcessing';
import { panoramaCulling, panoramaSubdivisionControl } from '../../../Process/PanoramaTileProcessing';
import PanoramaTileBuilder from './PanoramaTileBuilder';
import SubdivisionControl from '../../../Process/SubdivisionControl';
import ProjectionType from './Constants';
import Picking from '../../Picking';

class PanoramaLayer extends TiledGeometryLayer {
    /**
     * A geometry layer to be used only with a {@link PanoramaView}.
     *
     * @constructor
     *
     * @param {string} id
     * @param {Coordinates} coordinates
     * @param {string} type
     * @param {Object} options
     * @param {THREE.Object3D} options.object3d
     * @param {number} options.ratio=1
     * @param {number} [options.maxSubdivisionLevel=10]
     */
    constructor(id, coordinates, type, options) {
        super(id, options.object3d || new THREE.Group());

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

        if (type === ProjectionType.SPHERICAL) {
            // equirectangular -> spherical geometry
            this.schemeTile = [
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
            this.schemeTile = [
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
        this.disableSkirt = true;

        function subdivision(context, layer, node) {
            if (SubdivisionControl.hasEnoughTexturesToSubdivide(context, layer, node)) {
                return panoramaSubdivisionControl(
                    options.maxSubdivisionLevel || 10, new THREE.Vector2(512, 256))(context, layer, node);
            }
            return false;
        }

        this.update = processTiledGeometryNode(panoramaCulling, subdivision);
        this.builder = new PanoramaTileBuilder(type, options.ratio);
        this.segments = 8;
        this.quality = 0.5;
        // provide custom pick function
        this.pickObjectsAt = (_view, mouse, radius) => Picking.pickTilesAt(_view, mouse, radius, this);
    }


    preUpdate(context, changeSources) {
        SubdivisionControl.preUpdate(context, this);

        if (__DEBUG__) {
            this._latestUpdateStartingLevel = 0;
        }

        if (changeSources.has(undefined) || changeSources.size == 0) {
            return this.level0Nodes;
        }

        return super.preUpdate(context, changeSources);
    }
}

export default PanoramaLayer;
