import RasterLayer from 'Layer/RasterLayer';
import { updateLayeredMaterialNodeImagery } from 'Process/LayeredMaterialNodeProcessing';
import { RasterColorTile } from 'Renderer/RasterTile';
import { deprecatedColorLayerOptions } from 'Core/Deprecated/Undeprecator';

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
 * @property {StyleOptions|Style} style - style properties or a Style defined by the user,
 * to apply to the layer features.
 * @property {boolean} visible - property to display or to hide layer.
 * @property {number} opacity - property to adjust transparency, opacity is between 0. and 1.
 * @property {boolean} transparent - specify if the layer could be transparent.
 * @property {boolean} noTextureParentOutsideLimit - don't parent texture if it's outside limit.
 * @property {number} effect_type - type effect to apply on raster color.
 * if `effect_type` equals:
 * * `0`: no special effect.
 * * `1`: light color to invisible effect.
 * * `2`: white color to invisible effect.
 * * `3`: custom shader effect (defined `ShaderChunk.customBodyColorLayer` and `ShaderChunk.customHeaderColorLayer`).
 * @property {number} effect_parameter - amount value used with effect applied on raster color.
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
     * @param {number} [config.magFilter] - How the texture is sampled when a texel covers more than one pixel. [see](https://threejs.org/docs/?q=texture#api/en/textures/Texture.magFilter)
     * @param {number} [config.minFilter] - How the texture is sampled when a texel covers less than one pixel. [see](https://threejs.org/docs/?q=texture#api/en/textures/Texture.minFilter)
     * @param {number} [effect_type=0] - type effect to apply on raster color.
     * if `effect_type` equals:
     * * `0`: no special effect.
     * * `1`: light color to invisible effect.
     * * `2`: white color to invisible effect.
     * * `3`: custom shader effect (defined `ShaderChunk.customBodyColorLayer` and `ShaderChunk.customHeaderColorLayer`).
     * @param {number} [effect_parameter=1.0] - amount value used with effect applied on raster color.
     *
     * @example
     * // Create a ColorLayer
     * const color = new ColorLayer('roads', {
     *     source: new  SourceWMTS({
     *          protocol: 'wmts',
     *          url: 'http://server.geo/wmts/....',
     *          format: 'image/png',
     *          name: 'nameService',
     *          tileMatrixSet: 'PM',
     *     }),
     *     transparent: true,
     *     opacity: 0.5,
     * });
     *
     * // Add the layer
     * view.addLayer(color);
     */
    constructor(id, config = {}) {
        deprecatedColorLayerOptions(config);
        super(id, config);
        this.isColorLayer = true;
        this.style = config.style;
        this.defineLayerProperty('visible', true);
        this.defineLayerProperty('opacity', 1.0);
        this.defineLayerProperty('sequence', 0);
        this.transparent = config.transparent || (this.opacity < 1.0);
        this.noTextureParentOutsideLimit = config.source ? config.source.isFileSource : false;

        // Feature options
        this.buildExtent = true;
        this.structure = '2d';
    }

    /**
     * Setup RasterColorTile added to TileMesh. This RasterColorTile handles
     * the ColorLayer textures mapped on this TileMesh.
     *
     * @param      {TileMesh}  node    The node to apply new RasterColorTile;
     * @return     {RasterColorTile}  The raster color node added.
     */
    setupRasterNode(node) {
        const rasterColorNode = new RasterColorTile(node.material, this);

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
