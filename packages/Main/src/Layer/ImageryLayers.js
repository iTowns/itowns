
// move this to new index
// After the modification :
//      * the minimum sequence will always be 0
//      * the maximum sequence will always be layers.lenght - 1
// the ordering of all layers (Except that specified) doesn't change
export function moveLayerToIndex(layer, newIndex, imageryLayers) {
    newIndex = Math.min(newIndex, imageryLayers.length - 1);
    newIndex = Math.max(newIndex, 0);
    const oldIndex = layer.sequence;

    for (const imagery of imageryLayers) {
        if (imagery.id === layer.id) {
            // change index of specified layer
            imagery.sequence = newIndex;
        } else if (imagery.sequence > oldIndex && imagery.sequence <= newIndex) {
            // down all layers between the old index and new index (to compensate the deletion of the old index)
            imagery.sequence--;
        } else if (imagery.sequence >= newIndex && imagery.sequence < oldIndex) {
            // up all layers between the new index and old index (to compensate the insertion of the new index)
            imagery.sequence++;
        }
    }
}

export function moveLayerDown(layer, imageryLayers) {
    if (layer.sequence > 0) {
        moveLayerToIndex(layer, layer.sequence - 1, imageryLayers);
    }
}

export function moveLayerUp(layer, imageryLayers) {
    const m = imageryLayers.length - 1;
    if (layer.sequence < m) {
        moveLayerToIndex(layer, layer.sequence + 1, imageryLayers);
    }
}

export function getColorLayersIdOrderedBySequence(imageryLayers) {
    const copy = Array.from(imageryLayers);
    copy.sort((a, b) => a.sequence - b.sequence);
    return copy.map(l => l.id);
}
