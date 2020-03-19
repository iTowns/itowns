import * as THREE from 'three';

import TiledGeometryLayer from 'Layer/TiledGeometryLayer';
import { globalExtentTMS } from 'Core/Geographic/Extent';
import CRS from 'Core/Geographic/Crs';
import PlanarTileBuilder from './PlanarTileBuilder';

/**
 * @property {boolean} isPlanarLayer - Used to checkout whether this layer is a
 * PlanarLayer. Default is true. You should not change this, as it is used
 * internally for optimisation.
 */
class PlanarLayer extends TiledGeometryLayer {
    /**
     * A {@link TiledGeometryLayer} to use with a {@link PlanarView}. It has
     * specific method for updating and subdivising its grid.
     *
     * @constructor
     * @extends TiledGeometryLayer
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {Extent} extent - The extent to define the layer within.
     * @param {THREE.Object3d} [object3d=THREE.Group] - The object3d used to
     * contain the geometry of the TiledGeometryLayer. It is usually a
     * `THREE.Group`, but it can be anything inheriting from a `THREE.Object3d`.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name.
     * @param {number} [config.maxSubdivisionLevel=5] - Maximum subdivision
     * level for this tiled layer.
     * @param {number} [config.maxDeltaElevationLevel=4] - Maximum delta between
     * two elevations tile.
     *
     * @throws {Error} `object3d` must be a valid `THREE.Object3d`.
     */
    constructor(id, extent, object3d, config = {}) {
        const tms = CRS.formatToTms(extent.crs);
        const tileMatrixSets = [tms];
        if (!globalExtentTMS.get(extent.crs)) {
            // Add new global extent for this new projection.
            globalExtentTMS.set(extent.crs, extent);
        }
        config.tileMatrixSets = tileMatrixSets;
        super(id, object3d || new THREE.Group(), [extent], new PlanarTileBuilder({ projection: extent.crs }), config);
        this.isPlanarLayer = true;
        this.extent = extent;
        this.minSubdivisionLevel = this.minSubdivisionLevel == undefined ? 0 : this.minSubdivisionLevel;
        this.maxSubdivisionLevel = this.maxSubdivisionLevel == undefined ? 5 : this.maxSubdivisionLevel;
        this.maxDeltaElevation = this.maxDeltaElevation || 4.0;
    }
}

export default PlanarLayer;
