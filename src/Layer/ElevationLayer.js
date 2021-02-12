import RasterLayer from 'Layer/RasterLayer';
import { RasterElevationNode } from 'Renderer/MaterialLayer';

/**
 * @property {boolean} isElevationLayer - Used to checkout whether this layer is
 * an ElevationLayer. Default is true. You should not change this, as it is used
 * internally for optimisation.
 * @property {number} noDataValue - Used to specify a **null** or **no data value** in the elevation terrain.
 * @property {number} scale - Used to apply a scale on the elevation value. It
 * can be used for exageration of the elevation, like in [this
 * example](https://www.itowns-project.org/itowns/examples/#plugins_pyramidal_tiff).
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
     * @param {Source} [config.source] - Description and options of the source.
     *
     * @example
     * // Create an ElevationLayer
     * const elevation = new ElevationLayer('IGN_MNT', {
     *      source: {
     *          url: 'http://server.geo/wmts/SERVICE=WMTS&TILEMATRIX=%TILEMATRIX&TILEROW=%ROW&TILECOL=%COL',
     *          protocol: 'wmts',
     *          format: 'image/x-bil;bits=32',
     *      },
     * });
     *
     * // Add the layer
     * view.addLayer(elevation);
     */
    constructor(id, config = {}) {
        super(id, config);
        this.isElevationLayer = true;

        // This is used to add a factor needed to color texture
        let baseScale = 1.0;
        if (this.useColorTextureElevation) {
            baseScale = this.colorTextureElevationMaxZ - this.colorTextureElevationMinZ;
        }

        this.visible = true;

        this.defineLayerProperty('scale', this.scale || 1.0, (self) => {
            self.parent.object3d.traverse((obj) => {
                if (obj.layer == self.parent && obj.material) {
                    obj.material.setElevationScale(self.scale * baseScale);
                    obj.obb.updateScaleZ(self.scale);
                }
            });
        });
    }

    /**
     * Setup RasterElevationNode added to TileMesh. This RasterElevationNode handles
     * the ColorLayer textures mapped on this TileMesh.
     *
     * @param      {TileMesh}  node    The node to apply new RasterElevationNode;
     * @return     {RasterElevationNode}  The raster elevation node added.
     */
    setupRasterNode(node) {
        const rasterElevationNode = new RasterElevationNode(node.material, this);

        node.material.addLayer(rasterElevationNode);
        node.material.setSequenceElevation(this.id);
        // bounding box initialisation
        node.setBBoxZ(rasterElevationNode.min, rasterElevationNode.max, this.scale);

        // listen elevation updating
        rasterElevationNode.addEventListener('updatedElevation', () =>
            node.setBBoxZ(rasterElevationNode.min, rasterElevationNode.max, this.scale));

        return rasterElevationNode;
    }
}

export default ElevationLayer;
