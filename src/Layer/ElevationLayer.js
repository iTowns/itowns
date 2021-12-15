import RasterLayer from 'Layer/RasterLayer';
import { updateLayeredMaterialNodeElevation } from 'Process/LayeredMaterialNodeProcessing';
import { RasterElevationTile } from 'Renderer/RasterTile';

/**
 * @property {boolean} isElevationLayer - Used to checkout whether this layer is
 * an ElevationLayer. Default is true. You should not change this, as it is used
 * internally for optimisation.
 * @property {number} noDataValue - Used to specify a **null** or **no data value** in the elevation terrain.
 * @property {number} scale - Used to apply a scale on the elevation value. It
 * can be used for exageration of the elevation, like in [this
 * example](https://www.itowns-project.org/itowns/examples/#plugins_pyramidal_tiff).
 * @property {boolean} useColorTextureElevation - the elevation is computed with one color texture channel,
 * `this.colorTextureElevationMaxZ` and `this.colorTextureElevationMinZ`.
 *
 * The formula is:
 *
 * ```js
 * elevation = color.r * (this.colorTextureElevationMaxZ - this.colorTextureElevationMinZ) + this.colorTextureElevationMinZ
 * ```
 * @property {number} colorTextureElevationMinZ - elevation minimum in `useColorTextureElevation` mode.
 * @property {number} colorTextureElevationMaxZ - elevation maximum in `useColorTextureElevation` mode.
 */
class ElevationLayer extends RasterLayer {
    /**
     * A simple layer, managing an elevation texture to add some reliefs on the
     * plane or globe view for example.
     *
     * @constructor
     * @extends Layer
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name.
     *
     * @example
     * // Create an ElevationLayer
     * const elevation = new ElevationLayer('IGN_MNT', {
     *      source: new WMTSSource({
     *          "url": "https://wxs.ign.fr/3ht7xcw6f7nciopo16etuqp2/geoportail/wmts",
     *           "crs": "EPSG:4326",
     *           "format": "image/x-bil;bits=32",
     *           "name": "ELEVATION.ELEVATIONGRIDCOVERAGE",
     *      }),
     * });
     *
     * // Add the layer
     * view.addLayer(elevation);
     */
    constructor(id, config = {}) {
        super(id, config);
        this.isElevationLayer = true;
        this.defineLayerProperty('scale', this.scale || 1.0);
    }

    /**
     * Setup RasterElevationTile added to TileMesh. This RasterElevationTile handles
     * the elevation texture to displace TileMesh vertices.
     *
     * @param      {TileMesh}  node    The node to apply new RasterElevationTile;
     * @return     {RasterElevationTile}  The raster elevation node added.
     */
    setupRasterNode(node) {
        const rasterElevationNode = new RasterElevationTile(node.material, this);

        node.material.addLayer(rasterElevationNode);
        node.material.setSequenceElevation(this.id);
        // bounding box initialisation
        const updateBBox = () => node.setBBoxZ({
            min: rasterElevationNode.min, max: rasterElevationNode.max, scale: this.scale,
        });
        updateBBox();

        // listen elevation updating
        rasterElevationNode.addEventListener('updatedElevation', updateBBox);

        // listen scaling elevation updating
        this.addEventListener('scale-property-changed', updateBBox);
        // remove scaling elevation updating if node is removed
        node.addEventListener('dispose', () => {
            this.removeEventListener('scale-property-changed', updateBBox);
        });

        return rasterElevationNode;
    }

    update(context, layer, node, parent) {
        return updateLayeredMaterialNodeElevation(context, this, node, parent);
    }
}

export default ElevationLayer;
