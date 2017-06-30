import { ImageryLayers } from '../Core/Layer/Layer';

function updateLayersOrdering(geometryLayer, imageryLayers) {
    var sequence = ImageryLayers.getColorLayersIdOrderedBySequence(imageryLayers);
    var cO = function cO(object) {
        if (object.changeSequenceLayers) {
            object.changeSequenceLayers(sequence);
        }
    };

    for (const node of geometryLayer.level0Nodes) {
        node.traverse(cO);
    }
}

const ColorLayersOrdering = {
    /**
     * Moves up in the layer list. This function has no effect if the layer is moved to its current index.
     * @function moveLayerUp
     * @param      {View}  view the viewer
     * @param      {string}  layerId   The layer's idendifiant
     * @example
     * itowns.ColorLayersOrdering.moveLayerUp(viewer, 'idLayerToUp');
     */
    moveLayerUp: function moveLayerUp(view, layerId) {
        const imageryLayers = view.getLayers(l => l.type === 'color');
        const layer = view.getLayers(l => l.id === layerId)[0];
        if (layer) {
            ImageryLayers.moveLayerUp(layer, imageryLayers);
            updateLayersOrdering(view.wgs84TileLayer, imageryLayers);
            view.notifyChange(true);
        } else {
            throw new Error(`${layerId} isn't color layer`);
        }
    },
    /**
     * Moves down in the layer list. This function has no effect if the layer is moved to its current index.
     * @function moveLayerDown
     * @param      {View}  view the viewer
     * @param      {string}  layerId   The layer's idendifiant
     * @example
     * itowns.ColorLayersOrdering.moveLayerDown(viewer, 'idLayerToDown');
     */
    moveLayerDown: function moveLayerDown(view, layerId) {
        const imageryLayers = view.getLayers(l => l.type === 'color');
        const layer = view.getLayers(l => l.id === layerId)[0];
        if (layer) {
            ImageryLayers.moveLayerDown(layer, imageryLayers);
            updateLayersOrdering(view.wgs84TileLayer, imageryLayers);
            view.notifyChange(true);
        } else {
            throw new Error(`${layerId} isn't color layer`);
        }
    },
    /**
     * Moves a specific layer to a specific index in the layer list. This
     * function has no effect if the layer is moved to its current index.
     *
     * @function moveLayerToIndex
     * @param      {View}  view the viewer
     * @param      {string}  layerId   The layer's idendifiant
     * @param      {number}  newIndex   The new index
     * @example
     * itowns.ColorLayersOrdering.moveLayerToIndex(viewer, 'idLayerToChangeIndex', 2);
     */
    moveLayerToIndex: function moveLayerToIndex(view, layerId, newIndex) {
        const imageryLayers = view.getLayers(l => l.type === 'color');
        const layer = view.getLayers(l => l.id === layerId)[0];
        if (layer) {
            ImageryLayers.moveLayerToIndex(layer, newIndex, imageryLayers);
            updateLayersOrdering(view.wgs84TileLayer, imageryLayers);
            view.notifyChange(true);
        } else {
            throw new Error(`${layerId} isn't color layer`);
        }
    },
};
export default ColorLayersOrdering;
