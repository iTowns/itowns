import Layer from 'Layer/Layer';
import { updateLayeredMaterialNodeElevation, removeLayeredMaterialNodeLayer } from 'Process/LayeredMaterialNodeProcessing';
import textureConverter from 'Converter/textureConverter';

/**
 * @property {boolean} isElevationLayer - Used to checkout whether this layer is
 * an ElevationLayer. Default is true. You should not change this, as it is used
 * internally for optimisation.
 */
class ElevationLayer extends Layer {
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
     * @param {WMTSSource|WMSSource|WFSSource|TMSSource|FileSource} [config.source] -
     * Description and options of the source.
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
    }

    update(context, layer, node, parent) {
        return updateLayeredMaterialNodeElevation(context, this, node, parent);
    }

    convert(data, extentDestination) {
        return textureConverter.convert(data, extentDestination, this);
    }

    /**
    * All layer's textures are removed from scene and disposed from video device.
    */
    delete() {
        for (const root of this.parent.level0Nodes) {
            root.traverse(removeLayeredMaterialNodeLayer(this.id));
        }
    }
}

export default ElevationLayer;
