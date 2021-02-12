import RasterLayer from 'Layer/RasterLayer';
import { updateLayeredMaterialNodeImagery } from 'Process/LayeredMaterialNodeProcessing';
import { RasterColorNode } from 'Renderer/MaterialLayer';
import Style from 'Core/Style';

/**
 * Fires when the visiblity of the layer has changed.
 * @event ColorLayer#visible-property-changed
 */
/**
 * Fires when the opacity of the layer has changed.
 * @event ColorLayer#opacity-property-changed
 */
/**
 * Fires when the sequence of the layer has changed, meaning that the order of
 * the layer changed in the view it is attached to.
 * @event ColorLayer#sequence-property-changed
 */

/**
 * @property {boolean} isColorLayer - Used to checkout whether this layer is a
 * ColorLayer. Default is true. You should not change this, as it is used
 * internally for optimisation.
 */
class ColorLayer extends RasterLayer {
    /**
     * A simple layer, usually managing a texture to display on a view. For example,
     * it can be an aerial view of the ground or a simple transparent layer with the
     * roads displayed.
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
     * // Create a ColorLayer
     * const color = new ColorLayer('roads', {
     *     source: {
     *          protocol: 'wmts',
     *          url: 'http://server.geo/wmts/SERVICE=WMTS&TILEMATRIX=%TILEMATRIX&TILEROW=%ROW&TILECOL=%COL',
     *          format: 'image/png',
     *     }
     *     transparent: true
     * });
     *
     * // Add the layer
     * view.addLayer(color);
     */
    constructor(id, config = {}) {
        super(id, config);
        this.isColorLayer = true;
        this.style = new Style(config.style);
        this.defineLayerProperty('visible', true);
        this.defineLayerProperty('opacity', 1.0);
        this.defineLayerProperty('sequence', 0);
        this.transparent = config.transparent || (this.opacity < 1.0);
        this.noTextureParentOutsideLimit = config.source ? config.source.isFileSource : false;

        // Feature options
        this.buildExtent = true;
        this.withNormal = false;
        this.withAltitude = false;
    }

    /**
     * Setup RasterColorNode added to TileMesh. This RasterColorNode handles
     * the ColorLayer textures mapped on this TileMesh.
     *
     * @param      {TileMesh}  node    The node to apply new RasterColorNode;
     * @return     {RasterColorNode}  The raster color node added.
     */
    setupRasterNode(node) {
        const rasterColorNode = new RasterColorNode(node.material, this);

        node.material.addLayer(rasterColorNode);
        // set up ColorLayer ordering.
        node.material.setSequence(this.parent.colorLayersOrder);

        return rasterColorNode;
    }

    update(context, layer, node, parent) {
        return updateLayeredMaterialNodeImagery(context, this, node, parent);
    }
}

export default ColorLayer;
