import * as THREE from 'three';

import TiledGeometryLayer from 'Layer/TiledGeometryLayer';
import { globalExtentTMS, schemeTiles } from 'Core/Geographic/Extent';
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
     * @param {THREE.Object3d} [object3d=THREE.Group] - The object3d used to
     * contain the geometry of the TiledGeometryLayer. It is usually a
     * `THREE.Group`, but it can be anything inheriting from a `THREE.Object3d`.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name.
     * @param {Extent} config.extent - The extent to define the layer within.
     * @param {number} [config.maxSubdivisionLevel=5] - Maximum subdivision
     * level for this tiled layer.
     * @param {number} [config.maxDeltaElevationLevel=4] - Maximum delta between
     * two elevations tile.
     *
     * @throws {Error} `object3d` must be a valid `THREE.Object3d`.
     */
    constructor(id, object3d, config = {}) {
        if (arguments.length > 3 || object3d?.isExtent) {
            console.warn("Deprecated: change in arguments, 'extent' should be set in config");
            // eslint-disable-next-line prefer-rest-params
            const [, ext,, conf = {}] = arguments;
            conf.extent = ext;
            config = conf;
        }
        const extent = config.extent;
        const tms = CRS.formatToTms(extent.crs);

        const scheme = schemeTiles.get(tms);
        let schemeTile;
        let clipPlanes = [];
        if (scheme) {
            schemeTile = globalExtentTMS.get(extent.crs).subdivisionByScheme(scheme);
            clipPlanes = [
                new THREE.Plane(new THREE.Vector3(1, 0, 0), -extent.west),
                new THREE.Plane(new THREE.Vector3(-1, 0, 0), extent.east),
                new THREE.Plane(new THREE.Vector3(0, -1, 0), extent.north),
                new THREE.Plane(new THREE.Vector3(0, 1, 0), -extent.south),
            ];
            config.materialOptions = { clippingPlanes: clipPlanes };
        } else {
            schemeTile = [extent];
        }

        if (!globalExtentTMS.get(extent.crs)) {
            // Add new global extent for this new crs projection.
            globalExtentTMS.set(extent.crs, extent);
        }

        config.tileMatrixSets = [tms];

        const builder = new PlanarTileBuilder({ crs: extent.crs });

        super(id, object3d || new THREE.Group(), schemeTile, builder, config);

        this.isPlanarLayer = true;
        this.extent = extent;
        this.minSubdivisionLevel = this.minSubdivisionLevel == undefined ? 0 : this.minSubdivisionLevel;
        this.maxSubdivisionLevel = this.maxSubdivisionLevel == undefined ? 19 : this.maxSubdivisionLevel;
        this.maxDeltaElevationLevel = this.maxDeltaElevationLevel || 4.0;
    }

    culling(node, camera) {
        if (super.culling(node, camera)) {
            return true;
        }
        return !node.extent.intersectsExtent(this.extent);
    }
}

export default PlanarLayer;
