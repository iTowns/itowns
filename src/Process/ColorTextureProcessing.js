import LayerUpdateState from '../Core/Layer/LayerUpdateState';
import { ImageryLayers } from '../Core/Layer/Layer';
import CancelledCommandException from '../Core/Scheduler/CancelledCommandException';

const MAX_RETRY = 4;

function initColorTexturesFromParent(node, parent, layer) {
    if (!parent.material || !parent.material.getLayerTextures) {
        return false;
    }

    const coords = node.getCoordsForLayer(layer);
    const parentTextures = parent.material.getLayerTextures(layer);
    if (!parentTextures) {
        return false;
    }

    const textures = [];

    for (const c of coords) {
        for (const texture of parentTextures.textures) {
            if (!texture || !texture.extent) {
                continue;
            }
            if (c.isInside(texture.extent)) {
                textures.push({
                    texture,
                    pitch: c.offsetToParent(texture.extent),
                });
                break;
            }
        }
    }

    if (textures.length == coords.length) {
        node.material.setLayerTextures(layer, textures);
        return true;
    }
    return false;
}

function nodeCommandQueuePriorityFunction(node) {
    // We know that 'node' is visible because commands can only be
    // issued for visible nodes.

    // TODO: need priorization of displayed nodes
    if (node.material.visible) {
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

    return !cmd.requester.material.visible;
}


export default {
    updateLayerElement(context, layer, node, parent) {
        const material = node.material;

        if (!node.parent || !material) {
            return;
        }

        // Initialisation
        if (node.layerUpdateState[layer.id] === undefined) {
            node.layerUpdateState[layer.id] = new LayerUpdateState();

            if (!layer.tileInsideLimit(node, layer)) {
                // we also need to check that tile's parent doesn't have a texture for this layer,
                // because even if this tile is outside of the layer, it could inherit it's
                // parent texture
                if (!layer.noTextureParentOutsideLimit &&
                    parent &&
                    parent.material &&
                    parent.material.getLayerTextures(layer)) {
                    // ok, we're going to inherit our parent's texture
                } else {
                    node.layerUpdateState[layer.id].noMoreUpdatePossible();
                    return;
                }
            }

            // INIT TEXTURE
            material.pushLayer(layer, node.getCoordsForLayer(layer));

            const imageryLayers = context.view.getLayers((l, p) => l.type === 'color' && p == node.layer);
            const sequence = ImageryLayers.getColorLayersIdOrderedBySequence(imageryLayers);
            material.setSequence(sequence);

            if (parent && initColorTexturesFromParent(node, parent, layer)) {
                context.view.notifyChange(node, false);
                return;
            }
        }

        // Node is hidden, no need to update it
        if (!node.material.visible) {
            return;
        }

        // TODO: move this to defineLayerProperty() declaration
        // to avoid mixing layer's network updates and layer's params
        // Update material parameters
        material.setLayerVisibility(layer, layer.visible);
        material.setLayerOpacity(layer, layer.opacity);

        const ts = Date.now();
        // An update is pending / or impossible -> abort
        if (layer.frozen || !layer.visible || !node.layerUpdateState[layer.id].canTryUpdate(ts)) {
            return;
        }

        // Does this tile needs a new texture?
        const nextDownloads = layer.canTextureBeImproved(
            layer,
            node.getCoordsForLayer(layer),
            node.material.getLayerTextures(layer).textures,
            node.layerUpdateState[layer.id].failureParams);

        if (!nextDownloads) {
            node.layerUpdateState[layer.id].noMoreUpdatePossible();
            return;
        }

        node.layerUpdateState[layer.id].newTry();
        const command = {
            /* mandatory */
            view: context.view,
            layer,
            requester: node,
            priority: nodeCommandQueuePriorityFunction(node),
            earlyDropFunction: refinementCommandCancellationFn,
            toDownload: nextDownloads,
        };

        return context.scheduler.execute(command).then(
            (result) => {
                if (node.material === null) {
                    return;
                }

                node.material.setLayerTextures(layer, result);
                node.layerUpdateState[layer.id].success();

                return result;
            },
            (err) => {
                if (err instanceof CancelledCommandException) {
                    node.layerUpdateState[layer.id].success();
                } else {
                    if (__DEBUG__) {
                        console.warn('Imagery texture update error for', node, err);
                    }
                    const definitiveError = node.layerUpdateState[layer.id].errorCount > MAX_RETRY;
                    node.layerUpdateState[layer.id].failure(Date.now(), definitiveError, err);
                    if (!definitiveError) {
                        window.setTimeout(() => {
                            context.view.notifyChange(node, false);
                        }, node.layerUpdateState[layer.id].secondsUntilNextTry() * 1000);
                    }
                }
            });
    },
};

