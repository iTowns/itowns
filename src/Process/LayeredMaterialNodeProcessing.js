import RendererConstant from '../Renderer/RendererConstant';
import { l_ELEVATION, l_COLOR, EMPTY_TEXTURE_ZOOM } from '../Renderer/LayeredMaterial';
import { chooseNextLevelToFetch } from '../Core/Layer/LayerUpdateStrategy';
import LayerUpdateState from '../Core/Layer/LayerUpdateState';
import { ImageryLayers } from '../Core/Layer/Layer';
import { CancelledCommandException } from '../Core/Scheduler/Scheduler';
import OGCWebServiceHelper from '../Core/Scheduler/Providers/OGCWebServiceHelper';


function nodeCommandQueuePriorityFunction(node) {
    // We know that 'node' is visible because commands can only be
    // issued for visible nodes.

    // TODO: need priorization of displayed nodes
    if (node.isDisplayed()) {
        // Then prefer displayed() node over non-displayed one
        return 100;
    } else {
        return 10;
    }
}

function refinementCommandCancellationFn(cmd) {
    if (!cmd.requester.parent || !cmd.requester.material) {
        return true;
    }
    if (cmd.force) {
        return false;
    }

    return !cmd.requester.isDisplayed();
}

export function updateLayeredMaterialNodeImagery(context, layer, node) {
    if (!node.isDisplayed()) {
        return;
    }

    // upate params
    const layerIndex = node.materials[0].indexOfColorLayer(layer.id);
    node.materials[0].setLayerVisibility(layerIndex, layer.visible);
    node.materials[0].setLayerOpacity(layerIndex, layer.opacity);

    const ts = Date.now();

    OGCWebServiceHelper.computeTileMatrixSetCoordinates(node, layer.options.tileMatrixSet);

    // is tile covered by this layer?
    // We test early (rather than after chooseNextLevelToFetch like elevation)
    // because colorParams only exist for tiles where tileInsideLimit is true
    // (see `subdivideNode`)
    if (!layer.tileInsideLimit(node, layer)) {
        return Promise.resolve();
    }

    if (node.layerUpdateState[layer.id] === undefined) {
        node.layerUpdateState[layer.id] = new LayerUpdateState();
    }

    if (!node.layerUpdateState[layer.id].canTryUpdate(ts)) {
        return Promise.resolve();
    }

    const material = node.materials[RendererConstant.FINAL];

    if (material.indexOfColorLayer(layer.id) === -1) {
        const texturesCount = layer.tileTextureCount ?
            layer.tileTextureCount(node, layer) : 1;

        const paramMaterial = {
            tileMT: layer.options.tileMatrixSet,
            texturesCount,
            visible: layer.visible,
            opacity: layer.opacity,
            fx: layer.fx,
            idLayer: layer.id,
        };

        material.pushLayer(paramMaterial);
        const imageryLayers = context.view.getLayers(l => l.type === 'color');
        const sequence = ImageryLayers.getColorLayersIdOrderedBySequence(imageryLayers);
        material.setSequence(sequence);
    }

    // does this tile needs a new texture?
    if (!node.isColorLayerDownscaled(layer.id)) {
        return Promise.resolve();
    }
    // is fetching data from this layer disabled?
    if (!layer.visible || layer.frozen) {
        return Promise.resolve();
    }

    const currentLevel = node.materials[RendererConstant.FINAL].getColorLayerLevelById(layer.id);

    if (currentLevel > EMPTY_TEXTURE_ZOOM) {
        const zoom = node.wmtsCoords[layer.options.tileMatrixSet || 'WGS84G'][1].zoom;
        var targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, zoom, currentLevel, layer.updateStrategy.options);
        if (targetLevel <= currentLevel) {
            return Promise.resolve();
        }
    }
    // TODO: targetLevel shouldn't be ignored

    node.layerUpdateState[layer.id].newTry();
    const command = {
        /* mandatory */
        view: context.view,
        layer,
        requester: node,
        priority: nodeCommandQueuePriorityFunction(node),
        earlyDropFunction: refinementCommandCancellationFn,
    };

    return context.scheduler.execute(command).then(
        (result) => {
            if (node.material === null) {
                return;
            }

            if (Array.isArray(result)) {
                node.setTexturesLayer(result, l_COLOR, layer.id);
            } else if (result.texture) {
                if (!result.texture.coordWMTS) {
                    result.texture.coordWMTS = node.wmtsCoords[layer.options.tileMatrixSet || 'WGS84G'][0];
                }
                node.setTexturesLayer([result], l_COLOR, layer.id);
            } else {
                // TODO: null texture is probably an error
                // Maybe add an error counter for the node/layer,
                // and stop retrying after X attempts.
            }

            node.layerUpdateState[layer.id].success();

            return result;
        },
        (err) => {
            if (err instanceof CancelledCommandException) {
                node.layerUpdateState[layer.id].success();
            } else {
                node.layerUpdateState[layer.id].failure(Date.now());
                context.view.notifyChange(node.layerUpdateState[layer.id].secondsUntilNextTry() * 1000, false);
            }
        });
}

export function updateLayeredMaterialNodeElevation(context, layer, node, force) {
    if (!node.isDisplayed()) {
        return;
    }

    // TODO: we need either
    //  - compound or exclusive layers
    //  - support for multiple elevation layers

    // Elevation is currently handled differently from color layers.
    // This is caused by a LayeredMaterial limitation: only 1 elevation texture
    // can be used (where a tile can have N textures x M layers)
    const ts = Date.now();

    const material = node.materials[RendererConstant.FINAL];
    const currentElevation = material.getElevationLayerLevel();

    // If currentElevevation is EMPTY_TEXTURE_ZOOM but material.loadedTexturesCount[l_ELEVATION] is > 0
    // means that we already tried and failed to download an elevation texture
    if (currentElevation == EMPTY_TEXTURE_ZOOM && node.materials[0].loadedTexturesCount[l_ELEVATION] > 0) {
        return Promise.resolve();
    }
    if (layer.frozen && !force) {
        return Promise.resolve();
    }

    if (node.layerUpdateState[layer.id] === undefined) {
        node.layerUpdateState[layer.id] = new LayerUpdateState();
    }

    if (!node.layerUpdateState[layer.id].canTryUpdate(ts)) {
        return Promise.resolve();
    }

    OGCWebServiceHelper.computeTileMatrixSetCoordinates(node, layer.options.tileMatrixSet);

    // TODO: WMTS specific
    const zoom = node.wmtsCoords[layer.options.tileMatrixSet][1].zoom;
    const targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, zoom, currentElevation, layer.updateStrategy.options);
    const originalCoords = node.wmtsCoords[layer.options.tileMatrixSet];

    if (targetLevel < zoom) {
        // Update wmts coord to match the requested level
        node.wmtsCoords[layer.options.tileMatrixSet] = [];
        for (const c of originalCoords) {
            const modified = OGCWebServiceHelper.WMTS_WGS84Parent(c, targetLevel);
            node.wmtsCoords[layer.options.tileMatrixSet].push(modified);
        }
    }
    const inside = layer.tileInsideLimit(node, layer);

    // restore wmts coords
    node.wmtsCoords[layer.options.tileMatrixSet] = originalCoords;

    if (targetLevel <= currentElevation || !inside) {
        return Promise.resolve();
    }

    // TODO
    if (material.elevationLayersId.length === 0) {
        material.elevationLayersId.push(layer.id);
    }
    node.layerUpdateState[layer.id].newTry();

    const command = {
        /* mandatory */
        view: context.view,
        layer,
        requester: node,
        targetLevel,
        priority: nodeCommandQueuePriorityFunction(node),
        earlyDropFunction: refinementCommandCancellationFn,
        force,
    };

    return context.scheduler.execute(command).then(
        (terrain) => {
            if (node.material === null) {
                return;
            }

            node.layerUpdateState[layer.id].success();

            node.setTextureElevation(terrain);
        },
        (err) => {
            if (err instanceof CancelledCommandException) {
                node.layerUpdateState[layer.id].success();
            } else {
                node.layerUpdateState[layer.id].failure(Date.now());
                context.view.notifyChange(node.layerUpdateState[layer.id].secondsUntilNextTry() * 1000, false);
            }
        });
}
