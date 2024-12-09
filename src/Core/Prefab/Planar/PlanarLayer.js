import * as THREE from 'three';

import TiledGeometryLayer from 'Layer/TiledGeometryLayer';
import { globalExtentTMS } from 'Core/Tile/TileGrid';
import { PlanarTileBuilder } from './PlanarTileBuilder';

/**
 * @property {boolean} isPlanarLayer - Used to checkout whether this layer is a
 * PlanarLayer. Default is true. You should not change this, as it is used
 * internally for optimisation.
 * @extends TiledGeometryLayer
 */
class PlanarLayer extends TiledGeometryLayer {
    /**
     * A {@link TiledGeometryLayer} to use with a {@link PlanarView}. It has
     * specific method for updating and subdivising its grid.
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
     *
     * @throws {Error} `object3d` must be a valid `THREE.Object3d`.
     */
    constructor(id, extent, object3d, config = {}) {
        const {
            minSubdivisionLevel = 0,
            maxSubdivisionLevel = 5,
            ...tiledConfig
        } = config;

        const tileMatrixSets = [extent.crs];
        if (!globalExtentTMS.get(extent.crs)) {
            // Add new global extent for this new crs projection.
            globalExtentTMS.set(extent.crs, extent);
        }

        const builder = new PlanarTileBuilder({ crs: extent.crs });
        super(id, object3d || new THREE.Group(), [extent], builder, {
            tileMatrixSets,
            ...tiledConfig,
        });
        this.isPlanarLayer = true;
        this.extent = extent;

        this.minSubdivisionLevel = minSubdivisionLevel;
        this.maxSubdivisionLevel = maxSubdivisionLevel;
    }
}

export default PlanarLayer;
