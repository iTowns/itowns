import Layer from 'Layer/Layer';
import LayerUpdateState from 'Layer/LayerUpdateState';


export function geoidLayerIsVisible(tilelayer) {
    return tilelayer?.attachedLayers.filter(l => l.isGeoidLayer)[0]?.visible;
}

/**
 * `GeoidLayer` is a specific `{@link Layer}` which supports geoid height data. When added to a `{@link View}`, it
 * vertically translates each of the view's tiles by a proper geoid height value. For a given tile, the geoid height
 * value used for translation is the geoid height computed at the center of the tile.
 *
 * @example
 * // Create a GeoidLayer from a GTX geoid heights file.
 * const geoidLayer = new GeoidLayer('geoid', {
 *     source: new FileSource({
 *         url: 'url-to-some-GTX-geoid-heights-file.gtx',
 *         crs: 'EPSG:4326',
 *         format: 'application/gtx',
 *     }),
 * });
 */
class GeoidLayer extends Layer {
    /**
     * Creates a new instance of `GeoidLayer`.
     *
     * @param   {string}    id              An unique identifier for the layer.
     * @param   {Object}    config          The layer configuration. All elements in it will be merged as is in the
                                            * layer. For example, if the configuration contains three elements `name,
                                            * protocol, extent`, these elements will be available using `layer.name` or
                                            * something else depending on the property name. Only `config.source`
                                            * parameter is mandatory.
     * @param   {Object}    config.source   The source of the geoid data displayed by the `GeoidLayer`. It is mandatory
                                            * that the source data for a `GeoidLayer` be parsed into a
                                            * `{@link GeoidGrid}`. You can refer to `{@link GTXParser}`,
                                            * `{@link GDFParser}` and `{@link ISGParser}` to see how three standard
                                            * geoid height grid file formats are parsed into `{@link GeoidGrid}`.
     */
    constructor(id, config = {}) {
        super(id, config);
        this.isGeoidLayer = true;
        this.defineLayerProperty('visible', true);
    }

    updateNodeZ(node) {
        node.material.geoidHeight = this.visible ? node.geoidHeight : 0;
        node.obb.updateZ({ geoidHeight: node.material.geoidHeight });
    }

    update(context, layer, node, parent) {
        if (!parent || !node.material) {
            return;
        }

        // Don't update tile if its zoom is not within the layer's zoom limits
        const extentsDestination = node.getExtentsByProjection(layer.crs);
        const zoom = extentsDestination[0].zoom;
        if (zoom > layer.zoom.max || zoom < layer.zoom.min) {
            return;
        }

        if (node.layerUpdateState[layer.id] === undefined) {
            node.layerUpdateState[layer.id] = new LayerUpdateState();

            const updateNodeZ = () => this.updateNodeZ(node);
            layer.addEventListener('visible-property-changed', updateNodeZ);
            node.addEventListener('dispose', () => {
                layer.removeEventListener('visible-property-changed', updateNodeZ);
            });
        }

        if (
            layer.frozen
            || !layer.visible
            || !node.material.visible
            || !node.layerUpdateState[layer.id].canTryUpdate()
        ) {
            return;
        }

        node.layerUpdateState[layer.id].newTry();

        return this.getData(node.extent, extentsDestination).then(
            (result) => {
                node.geoidHeight = result.getHeightAtCoordinates(node.extent.center());
                this.updateNodeZ(node);

                node.layerUpdateState[layer.id].noMoreUpdatePossible();
            },
        );
    }
}


export default GeoidLayer;
