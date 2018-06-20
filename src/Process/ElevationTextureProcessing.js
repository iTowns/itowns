import LayerUpdateState from '../Core/Layer/LayerUpdateState';
import CancelledCommandException from '../Core/Scheduler/CancelledCommandException';
import { SIZE_TEXTURE_TILE } from '../Provider/OGCWebServiceHelper';
import { computeMinMaxElevation } from '../Parser/XbilParser';

// max retry loading before changing the status to definitiveError
const MAX_RETRY = 4;

function initNodeElevationTextureFromParent(node, parent, layer) {
    // Inherit parent's elevation texture. Note that contrary to color layers the elevation level of the
    // node might not be EMPTY_TEXTURE_ZOOM in this init function. That's because we can have
    // multiple elevation layers (thus multiple calls to initNodeElevationTextureFromParent) but a given
    // node can only use 1 elevation texture
    const nodeTexture = node.material.getLayerTextures(layer);
    const parentTexture = parent.material.getLayerTextures(layer)[0];
    if (!parentTexture.extent) {
        return;
    }
    if (!nodeTexture.extent || parentTexture.extent.isInside(nodeTexture.extent)) {
        const coords = node.getCoordsForLayer(layer);

        const pitch = coords[0].offsetToParent(parentTexture.extent);
        const elevation = {
            texture: parentTexture,
            pitch,
        };

        const { min, max } = computeMinMaxElevation(
            parentTexture.image.data,
            SIZE_TEXTURE_TILE, SIZE_TEXTURE_TILE,
            pitch);
        elevation.min = min;
        elevation.max = max;

        node.setTextureElevation(layer, elevation);
    }
}

function getIndiceWithPitch(i, pitch, w) {
    // Return corresponding indice in parent tile using pitch
    const currentX = (i % w) / w;  // normalized
    const currentY = Math.floor(i / w) / w; // normalized
    const newX = pitch.x + currentX * pitch.z;
    const newY = pitch.y + currentY * pitch.w;
    const newIndice = Math.floor(newY * w) * w + Math.floor(newX * w);
    return newIndice;
}

function insertSignificantValuesFromParent(texture, node, parent, layer) {
    const parentTexture = parent.material.getLayerTextures(layer)[0];
    if (parentTexture.extent) {
        const coords = node.getCoordsForLayer(layer);
        const pitch = coords[0].offsetToParent(parentTexture.extent);
        const tData = texture.image.data;
        const l = tData.length;

        for (var i = 0; i < l; ++i) {
            if (tData[i] === layer.noDataValue) {
                tData[i] = parentTexture.image.data[getIndiceWithPitch(i, pitch, 256)];
            }
        }
    }
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

function checkNodeElevationTextureValidity(texture, noDataValue) {
    // We check if the elevation texture has some significant values through corners
    const tData = texture.image.data;
    const l = tData.length;
    return tData[0] > noDataValue &&
           tData[l - 1] > noDataValue &&
           tData[Math.sqrt(l) - 1] > noDataValue &&
           tData[l - Math.sqrt(l)] > noDataValue;
}

export default {
    updateLayerElement(context, layer, node, parent) {
        const material = node.material;

        if (!node.parent || !material) {
            return;
        }

        // TODO: we need either
        //  - compound or exclusive layers
        //  - support for multiple elevation layers

        // Initialisation
        if (node.layerUpdateState[layer.id] === undefined) {
            node.layerUpdateState[layer.id] = new LayerUpdateState();

            if (parent && parent.material && initNodeElevationTextureFromParent(node, parent, layer)) {
                context.view.notifyChange(node, false);
                return;
            }
        }

        // Try to update
        const ts = Date.now();

        // Possible conditions to *not* update the elevation texture
        if (layer.frozen ||
                !node.material.visible ||
                !node.layerUpdateState[layer.id].canTryUpdate(ts)) {
            return;
        }

        // Does this tile needs a new texture?
        const nextDownloads = layer.canTextureBeImproved(
            layer,
            node.getCoordsForLayer(layer),
            node.material.getLayerTextures(layer),
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

                // We currently only support a single elevation texture
                if (Array.isArray(result)) {
                    result = result[0];
                }

                const currentTexture = node.material.getLayerTextures(layer);
                if (currentTexture.extent) {
                    // Cancel update if current texture extent is <= new texture
                    if (currentTexture.extent.isInside(result.texture.extent)) {
                        return;
                    }
                }
                return result;
            },
            (err) => {
                if (err instanceof CancelledCommandException) {
                    node.layerUpdateState[layer.id].success();
                } else {
                    if (__DEBUG__) {
                        console.warn('Elevation texture update error for', node, err);
                    }
                    const definitiveError = node.layerUpdateState[layer.id].errorCount > MAX_RETRY;
                    node.layerUpdateState[layer.id].failure(Date.now(), definitiveError, err);
                    if (!definitiveError) {
                        window.setTimeout(() => {
                            context.view.notifyChange(node, false);
                        }, node.layerUpdateState[layer.id].secondsUntilNextTry() * 1000);
                    }
                }
            }).then((terrain) => {
                if (!terrain) {
                    return;
                }
                if (terrain.texture && terrain.texture.flipY) {
                    // DataTexture default to false, so make sure other Texture types
                    // do the same (eg image texture)
                    // See UV construction for more details
                    terrain.texture.flipY = false;
                    terrain.texture.needsUpdate = true;
                }

                if (terrain.texture &&
                    terrain.texture.image.data &&
                    !checkNodeElevationTextureValidity(terrain.texture, layer.noDataValue)) {
                    // Quick check to avoid using elevation texture with no data value
                    // If we have no data values, we use value from the parent tile
                    // We should later implement multi elevation layer to choose the one to use at each level
                    insertSignificantValuesFromParent(terrain.texture, node, parent, layer);
                }

                // TODO do xbil specific processing here, instead of doing it
                // early in OGCWebServiceHelper
                return terrain;
            }).then((texture) => {
                if (!texture) { return; }

                node.setTextureElevation(layer, texture);
                node.layerUpdateState[layer.id].success();
            });
    },
};
