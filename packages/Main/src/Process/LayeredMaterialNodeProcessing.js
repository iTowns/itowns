export function updateLayeredMaterialNodeImagery(context, layer, node, parent) {
    const material = node.material;
    if (!parent || !material) {
        return;
    }
    const tiles = node.getExtentsByProjection(layer.crs);

    const zoom = tiles[0].zoom;

    if (zoom < layer.source.zoom.min) {
        return;
    }

    let nodeLayer = material.getTile(layer.id);
    let overideElevation = true;

    if (layer.isElevationLayer && material.getElevationTile()) {
        overideElevation = layer.source.zoom.min > material.getElevationTile().layer.source.zoom.max;
    }

    if (nodeLayer === undefined && overideElevation) {
        // Create new raster node
        nodeLayer = layer.setupRasterNode(node);
        nodeLayer.tiles = tiles;

        // Init the node by parent
        const parentLayer = layer.isColorLayer ? parent.material?.getColorTile(layer.id) : parent.material?.getElevationTile();
        nodeLayer.initFromParent(parentLayer, tiles);

        nodeLayer.addEventListener('RasterTileLoaded', () => {
            material.layersNeedUpdate = true;
            context.view.notifyChange(node, true);
        });

        nodeLayer.addEventListener('nextTry', () => context.view.notifyChange(node, false));
    }
}

export function removeLayeredMaterialNodeTile(tileId) {
    /**
     * @param {TileMesh} node - The node to udpate.
     */
    return function removeLayeredMaterialNodeTile(node) {
        if (node.material?.removeTile) {
            if (node.material.elevationTile !== undefined) {
                node.setBBoxZ({ min: 0, max: 0 });
            }
            node.material.removeTile(tileId);
        }
        if (node.layerUpdateState && node.layerUpdateState[tileId]) {
            delete node.layerUpdateState[tileId];
        }
    };
}
