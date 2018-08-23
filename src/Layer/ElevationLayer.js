import Layer from './Layer';
import { updateLayeredMaterialNodeElevation } from '../Process/LayeredMaterialNodeProcessing';
import textureConverter from '../Parser/textureConverter';

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
     * contains three elements <code>name, protocol, extent</code>, these
     * elements will be available using <code>layer.name</code> or something
     * else depending on the property name.
     * @param {WMTSSource|WMSSource|WFSSource|TMSSource|FileSource} [config.source] data source
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
     *
     * @example
     * // Add and create an ElevationLayer
     * view.addLayer({
     *     id: 'IGN_MNT',
     *     type: 'elevation',
     *     source: {
     *          url: 'http://server.geo/wmts/SERVICE=WMTS&TILEMATRIX=%TILEMATRIX&TILEROW=%ROW&TILECOL=%COL',
     *          protocol: 'wmts',
     *          format: 'image/x-bil;bits=32',
     *     },
     * });
     */
    constructor(id, config = {}) {
        super(id, 'elevation', config);
    }

    update(context, layer, node, parent) {
        return updateLayeredMaterialNodeElevation(context, this, node, parent);
    }

    convert(data, extentDestination) {
        return textureConverter.convert(data, extentDestination, this);
    }
}

export default ElevationLayer;
