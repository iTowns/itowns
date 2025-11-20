import RasterLayer from 'Layer/RasterLayer';
import { RasterColorTile } from 'Renderer/RasterTile';
import { deprecatedColorLayerOptions } from 'Core/Deprecated/Undeprecator';
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
 * @property {StyleOptions|Style} style - style properties or a Style defined by the user,
 * to apply to the layer features.
 * @property {boolean} visible - property to display or to hide layer.
 * @property {number} opacity - property to adjust transparency, opacity is between 0. and 1.
 * @property {boolean} transparent - specify if the layer could be transparent.
 * @property {boolean} noTextureParentOutsideLimit - don't parent texture if it's outside limit.
 * @property {number} effect_type - type effect to apply on the raster color.
 * If `effect_type` equals:
 * * `0`: no effect.
 * * `1`: light color to invisible effect: transparency effect is stronger for
 *   light colors (whose distance is closer to white). This effect can be
 *   amplified by `effect_parameter`.
 * * `2`: white color to invisible effect: white color is considered as
 *   transparent.
 * * `3`: custom shader effect: set `ShaderChunk.customBodyColorLayer` and
 *   `ShaderChunk.customHeaderColorLayer` to add your own glsl code in
 *   respectively the color layer function body and at top-level.
 * @property {number} effect_parameter - value used as parameter of certain type
 * of effects. If `effect_type` equals:
 * * `0`: unused.
 * * `1`: used to amplify the transparency effect.
 * * `2`: unused.
 * * `3`: could be used by your own glsl code.
 *
 * @extends RasterLayer
 */
class ColorLayer extends RasterLayer {
    /**
     * A simple layer, usually managing a texture to display on a view. For example,
     * it can be an aerial view of the ground or a simple transparent layer with the
     * roads displayed.
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
     * @param {number} [config.effect_type=0] - type effect to apply on raster color.
     * if `effect_type` equals:
     * * `0`: no special effect.
     * * `1`: light color to invisible effect.
     * * `2`: white color to invisible effect.
     * * `3`: custom shader effect (defined `ShaderChunk.customBodyColorLayer` and `ShaderChunk.customHeaderColorLayer`).
     * @param {number} [config.effect_parameter=1.0] - amount value used with effect applied on raster color.
     * @param {(boolean|Object)} [config.addLabelLayer] - Used to indicate
     * whether this layer can display labels from the data. For example, it
     * needs to be set for vector tile layers if you want to display labels.
     * If set, a new `LabelLayer` is added and attached to this layer.
     * You can also configure it with {@link LabelLayer} options described below
     * such as: `addLabelLayer: { performance: true }`.
     * @param {boolean} [config.addLabelLayer.performance=false] - When adding
     * a label layer, remove all labels that have no chance of being visible.
     * Even if a label is visible, it may never be displayed if there are too
     * many labels in the same screen area.
     * @param {boolean} [config.addLabelLayer.forceClampToTerrain=false] - Use
     * elevation layer to clamp labels to terrain.
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

        const {
            effect_type = 0,
            effect_parameter = 1.0,
            transparent,
            addLabelLayer = false,
            mergeFeatures = true,
            style = {},
            ...rasterConfig
        } = config;

        super(id, rasterConfig);

        /**
         * @type {boolean}
         * @readonly
         */
        this.isColorLayer = true;

        this.style = style instanceof Style ? style : new Style(style);

        /**
         * @type {boolean}
         */
        this.visible = true;
        this.defineLayerProperty('visible', this.visible);

        /**
         * @type {number}
         */
        this.opacity = 1.0;
        this.defineLayerProperty('opacity', this.opacity);

        /**
         * @type {number}
         */
        this.sequence = 0;
        this.defineLayerProperty('sequence', this.sequence);

        this.transparent = transparent || (this.opacity < 1.0);
        this.noTextureParentOutsideLimit = config.source ? config.source.isFileSource : false;

        this.effect_type = effect_type;
        this.effect_parameter = effect_parameter;

        // Feature options
        this.buildExtent = true;
        this.structure = '2d';
        this.addLabelLayer = addLabelLayer;
        this.mergeFeatures = mergeFeatures;
    }

    /**
     * Setup RasterColorTile added to TileMesh. This RasterColorTile handles
     * the ColorLayer textures mapped on this TileMesh.
     *
     * @param      {TileMesh}  node    The node to apply new RasterColorTile;
     * @return     {RasterColorTile}  The raster color node added.
     */
    setupRasterNode(node) {
        const tiles = node.getExtentsByProjection(this.crs);

        const rasterColorTile = new RasterColorTile(this, tiles);

        rasterColorTile.initFromParent(node.parent.material?.getColorTile(this.id));

        node.material.addColorTile(rasterColorTile);
        // set up ColorLayer ordering.
        node.material.setColorTileIds(this.parent.colorLayersOrder);

        return rasterColorTile;
    }
}

export default ColorLayer;
