import * as THREE from 'three';

import { l_ELEVATION } from '../../../Renderer/LayeredMaterialConstants';
import TiledGeometryLayer from '../../../Layer/TiledGeometryLayer';
import PlanarTileBuilder from './PlanarTileBuilder';

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
     * <code>THREE.Group</code>, but it can be anything inheriting from a
     * <code>THREE.Object3d</code>.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements <code>name, protocol, extent</code>, these
     * elements will be available using <code>layer.name</code> or something
     * else depending on the property name.
     * @param {number} [config.maxSubdivisionLevel=5] - Maximum subdivision
     * level for this tiled layer.
     * @param {number} [config.maxDeltaElevationLevel=4] - Maximum delta between
     * two elevations tile.
     *
     * @throws {Error} <code>object3d</code> must be a valid
     * <code>THREE.Object3d</code>.
     */
    constructor(id, extent, object3d, config = {}) {
        super(id, object3d || new THREE.Group(), [extent], new PlanarTileBuilder(), config);
        this.extent = extent;
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
        const maxLevel = this.maxSubdivisionLevel || 5;
        const maxDeltaElevationLevel = this.maxDeltaElevationLevel || 4;

        if (maxLevel <= node.level) {
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
            if (ratio < 1 / Math.pow(2, maxDeltaElevationLevel)) {
                return false;
            }
        }

        const onScreen = context.camera.box3SizeOnScreen(node.obb.box3D, node.matrixWorld);

        // onScreen.x/y/z are [-1, 1] so divide by 2
        // (so x = 0.4 means the object width on screen is 40% of the total screen width)
        const dim = {
            x: 0.5 * (onScreen.max.x - onScreen.min.x) * context.camera.width,
            y: 0.5 * (onScreen.max.y - onScreen.min.y) * context.camera.height,
        };

        // subdivide if on-screen width (and resp. height) is bigger than 30% of the screen width (resp. height)
        // TODO: the 30% value is arbitrary and needs to be configurable by the user
        // TODO: we might want to use texture resolution here as well
        return (dim.x >= 256 && dim.y >= 256);
    }
}

export default PlanarLayer;
