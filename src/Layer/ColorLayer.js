import Layer from './Layer';
import { updateLayeredMaterialNodeImagery } from '../Process/LayeredMaterialNodeProcessing';

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

class ColorLayer extends Layer {
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
     * contains three elements <code>name, protocol, extent</code>, these
     * elements will be available using <code>layer.name</code> or something
     * else depending on the property name.
     *
     * @example
     * // Create a ColorLayer
     * const color = new ColorLayer('roads', {
     *     url: 'http://server.geo/wmts/SERVICE=WMTS&TILEMATRIX=%TILEMATRIX&TILEROW=%ROW&TILECOL=%COL',
     *     protocol: 'wmts',
     *     format: 'image/png',
     *     transparent: true
     * });
     *
     * // Add the layer
     * view.addLayer(color);
     *
     * @example
     * // Add and create a ColorLayer
     * view.addLayer({
     *     id: 'roads',
     *     type: 'color',
     *     url: 'http://server.geo/wmts/SERVICE=WMTS&TILEMATRIX=%TILEMATRIX&TILEROW=%ROW&TILECOL=%COL',
     *     protocol: 'wmts',
     *     format: 'image/png',
     *     transparent: true
     * });
     */
    constructor(id, config = {}) {
        super(id, 'color', config);

        this.defineLayerProperty('visible', true);
        this.defineLayerProperty('opacity', 1.0);
        this.defineLayerProperty('sequence', 0);
    }

    update(context, layer, node, parent) {
        return updateLayeredMaterialNodeImagery(context, this, node, parent);
    }
}

export default ColorLayer;
