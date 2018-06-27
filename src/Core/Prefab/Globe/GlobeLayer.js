import * as THREE from 'three';

import TiledGeometryLayer from '../../../Layer/TiledGeometryLayer';

import { globeCulling, preGlobeUpdate, globeSubdivisionControl, globeSchemeTileWMTS, globeSchemeTile1 } from '../../../Process/GlobeTileProcessing';
import BuilderEllipsoidTile from './BuilderEllipsoidTile';

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
        super(id, object3d || new THREE.Group(), config);

        this.options.defaultPickingRadius = 5;

        // Configure tiles
        this.schemeTile = globeSchemeTileWMTS(globeSchemeTile1);
        this.extent = this.schemeTile[0].clone();
        for (let i = 1; i < this.schemeTile.length; i++) {
            this.extent.union(this.schemeTile[i]);
        }

        this.culling = globeCulling(2);
        this.subdivision = globeSubdivisionControl(2,
            config.maxSubdivisionLevel || 18,
            config.sseSubdivisionThreshold || 1.0,
            config.maxDeltaElevationLevel || 4);

        this.builder = new BuilderEllipsoidTile();
    }

    preUpdate(context, changeSources) {
        preGlobeUpdate(context, this);

        return super.preUpdate(context, changeSources);
    }
}

export default GlobeLayer;
