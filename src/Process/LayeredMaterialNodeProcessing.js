import { l_ELEVATION, l_COLOR, EMPTY_TEXTURE_ZOOM } from '../Renderer/LayeredMaterial';
import { chooseNextLevelToFetch } from '../Core/Layer/LayerUpdateStrategy';
import LayerUpdateState from '../Core/Layer/LayerUpdateState';
import { ImageryLayers } from '../Core/Layer/Layer';
import { CancelledCommandException } from '../Core/Scheduler/Scheduler';
import OGCWebServiceHelper, { SIZE_TEXTURE_TILE } from '../Core/Scheduler/Providers/OGCWebServiceHelper';

// max retry loading before changing the status to definitiveError
const MAX_RETRY = 4;

function initNodeImageryTexturesFromParent(node, parent, layer) {
    if (parent.material && parent.material.getColorLayerLevelById(layer.id) > EMPTY_TEXTURE_ZOOM) {
        const coords = node.getCoordsForLayer(layer);
        const offsetTextures = node.material.getLayerTextureOffset(layer.id);

        let textureIndex = offsetTextures;
        for (const c of coords) {
            for (const texture of parent.material.getLayerTextures(l_COLOR, layer.id)) {
                if (c.isInside(texture.coords)) {
                    const result = c.offsetToParent(texture.coords);
                    node.material.textures[l_COLOR][textureIndex] = texture;
                    node.material.offsetScale[l_COLOR][textureIndex] = result;
                    textureIndex++;
                    break;
                }
            }
        }

        if (__DEBUG__) {
            if ((textureIndex - offsetTextures) != coords.length) {
                /* eslint-disable */
                console.error(`non-coherent result ${textureIndex} ${offsetTextures} vs ${coords.length}. ${coords}`);
                /* eslint-enable */
            }
        }
        const index = node.material.indexOfColorLayer(layer.id);
        node.material.layerTexturesCount[index] = coords.length;
        node.material.loadedTexturesCount[l_COLOR] += coords.length;
    }
}

function initNodeElevationTextureFromParent(node, parent, layer) {
    // inherit parent's elevation texture
    if (parent.material && parent.material.getElevationLayerLevel() > EMPTY_TEXTURE_ZOOM) {
        const coords = node.getCoordsForLayer(layer);

        const texture = parent.material.textures[l_ELEVATION][0];
        const pitch = coords[0].offsetToParent(parent.material.textures[l_ELEVATION][0].coords);
        const elevation = {
            texture,
            pitch,
        };

        // If the texture resolution has a poor precision for this node, we don't
        // extract min-max from the texture (too few information), we instead chose
        // to use parent's min-max.
        const useMinMaxFromParent = node.level - texture.coords.zoom > 6;
        if (!useMinMaxFromParent) {
            const { min, max } = OGCWebServiceHelper.ioDXBIL.computeMinMaxElevation(
                texture.image.data,
                SIZE_TEXTURE_TILE, SIZE_TEXTURE_TILE,
                pitch);
            elevation.min = min;
            elevation.max = max;
        }

        node.setTextureElevation(elevation);
        node.material.elevationLayersId =
            parent.material.elevationLayersId;
    }
}

function getIndiceWithPitch(i, pitch, w) {
    // Return corresponding indice in parent tile using pitch
    const currentX = (i % w) / w;  // normalized
    const currentY = Math.floor(i / w) / w; // normalized
    const newX = pitch.x + currentX * pitch.z;
    const newY = pitch.y + currentY * pitch.z;
    const newIndice = Math.floor(newY * w) * w + Math.floor(newX * w);
    return newIndice;
}

function insertSignificantValuesFromParent(texture, node, parent, layer) {
    if (parent.material && parent.material.getElevationLayerLevel() > EMPTY_TEXTURE_ZOOM) {
        const coords = node.getCoordsForLayer(layer);
        const textureParent = parent.material.textures[l_ELEVATION][0];
        const pitch = coords[0].offsetToParent(parent.material.textures[l_ELEVATION][0].coords);
        const tData = texture.image.data;
        const l = tData.length;

        for (var i = 0; i < l; ++i) {
            if (tData[i] === layer.noDataValue) {
                tData[i] = textureParent.image.data[getIndiceWithPitch(i, pitch, 256)];
            }
        }
    }
}

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

function checkNodeElevationTextureValidity(texture, noDataValue) {
    // We check if the elevation texture has some significant values through corners
    const tData = texture.image.data;
    const l = tData.length;
    return tData[0] > noDataValue &&
           tData[l - 1] > noDataValue &&
           tData[Math.sqrt(l) - 1] > noDataValue &&
           tData[l - Math.sqrt(l)] > noDataValue;
}

export function updateLayeredMaterialNodeImagery(context, layer, node) {
    if (!node.parent) {
        return;
    }
    if (!layer.tileInsideLimit(node, layer)) {
        // we also need to check that tile's parent doesn't have a texture for this layer,
        // because even if this tile is outside of the layer, it could inherit it's
        // parent texture
        if (!layer.noTextureParentOutsideLimit &&
            node.parent &&
            node.parent.material &&
            node.parent.getIndexLayerColor &&
            node.parent.getIndexLayerColor(layer.id) >= 0) {
            // ok, we're going to inherint our parent's texture
        } else {
            return Promise.resolve();
        }
    }

    const material = node.material;

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

        initNodeImageryTexturesFromParent(node, node.parent, layer);
    }

    if (!node.isDisplayed() || !layer.tileInsideLimit(node, layer)) {
        return Promise.resolve();
    }

    // upate params
    const layerIndex = material.indexOfColorLayer(layer.id);
    material.setLayerVisibility(layerIndex, layer.visible);
    material.setLayerOpacity(layerIndex, layer.opacity);

    const ts = Date.now();

    if (node.layerUpdateState[layer.id] === undefined) {
        node.layerUpdateState[layer.id] = new LayerUpdateState();
    }

    if (!node.layerUpdateState[layer.id].canTryUpdate(ts)) {
        return Promise.resolve();
    }

    // does this tile needs a new texture?
    if (layer.canTileTextureBeImproved) {
        // if the layer has a custom method -> use it
        if (!layer.canTileTextureBeImproved(layer, node)) {
            return Promise.resolve();
        }
    } else if (!node.isColorLayerDownscaled(layer)) {
        // default decision method
        return Promise.resolve();
    }

    // is fetching data from this layer disabled?
    if (!layer.visible || layer.frozen) {
        return Promise.resolve();
    }

    const currentLevel = node.material.getColorLayerLevelById(layer.id);
    const zoom = node.getCoordsForLayer(layer)[0].zoom || node.level;
    const targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, node, zoom, currentLevel, layer);
    if (targetLevel <= currentLevel) {
        return Promise.resolve();
    }

    node.layerUpdateState[layer.id].newTry();
    const command = {
        /* mandatory */
        view: context.view,
        layer,
        requester: node,
        priority: nodeCommandQueuePriorityFunction(node),
        earlyDropFunction: refinementCommandCancellationFn,
        targetLevel,
    };

    return context.scheduler.execute(command).then(
        (result) => {
            if (node.material === null) {
                return;
            }

            if (Array.isArray(result)) {
                node.setTexturesLayer(result, l_COLOR, layer.id);
            } else if (result.texture) {
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
                if (__DEBUG__) {
                    // eslint-disable-next-line no-console
                    console.warn(`Imagery texture update error for ${node}: ${err}`);
                }
                const definitiveError = node.layerUpdateState[layer.id].errorCount > MAX_RETRY;
                node.layerUpdateState[layer.id].failure(Date.now(), definitiveError);
                if (!definitiveError) {
                    window.setTimeout(() => {
                        context.view.notifyChange(false, node);
                    }, node.layerUpdateState[layer.id].secondsUntilNextTry() * 1000);
                }
            }
        });
}

export function updateLayeredMaterialNodeElevation(context, layer, node, force) {
    if (!node.parent) {
        return;
    }
    // TODO: we need either
    //  - compound or exclusive layers
    //  - support for multiple elevation layers

    // Elevation is currently handled differently from color layers.
    // This is caused by a LayeredMaterial limitation: only 1 elevation texture
    // can be used (where a tile can have N textures x M layers)
    const ts = Date.now();

    const material = node.material;
    let currentElevation = material.getElevationLayerLevel();

    // If currentElevevation is EMPTY_TEXTURE_ZOOM but material.loadedTexturesCount[l_ELEVATION] is > 0
    // means that we already tried and failed to download an elevation texture
    if (currentElevation == EMPTY_TEXTURE_ZOOM && node.material.loadedTexturesCount[l_ELEVATION] > 0) {
        return Promise.resolve();
    }
    if (layer.frozen && !force) {
        return Promise.resolve();
    }

    if (node.layerUpdateState[layer.id] === undefined) {
        node.layerUpdateState[layer.id] = new LayerUpdateState();
        initNodeElevationTextureFromParent(node, node.parent, layer);
        currentElevation = material.getElevationLayerLevel();
    }
    if (!node.isDisplayed()) {
        return Promise.resolve();
    }

    if (!node.layerUpdateState[layer.id].canTryUpdate(ts)) {
        return Promise.resolve();
    }

    const c = node.getCoordsForLayer(layer)[0];
    const zoom = c.zoom || node.level;
    const targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, node, zoom, currentElevation, layer);

    if (targetLevel <= currentElevation || !layer.tileInsideLimit(node, layer, targetLevel)) {
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

            if (terrain.texture && terrain.texture.flipY) {
                // DataTexture default to false, so make sure other Texture types
                // do the same (eg image texture)
                // See UV construction for more details
                terrain.texture.flipY = false;
                terrain.texture.needsUpdate = true;
            }

            if (terrain.texture && terrain.texture.image.data && !checkNodeElevationTextureValidity(terrain.texture, layer.noDataValue)) {
                // Quick check to avoid using elevation texture with no data value
                // If we have no data values, we use value from the parent tile
                // We should later implement multi elevation layer to choose the one to use at each level
                insertSignificantValuesFromParent(terrain.texture, node, node.parent, layer);
            }

            node.setTextureElevation(terrain);
        },
        (err) => {
            if (err instanceof CancelledCommandException) {
                node.layerUpdateState[layer.id].success();
            } else {
                if (__DEBUG__) {
                    // eslint-disable-next-line no-console
                    console.warn(`Elevation texture update error for ${node}: ${err}`);
                }
                const definitiveError = node.layerUpdateState[layer.id].errorCount > MAX_RETRY;
                node.layerUpdateState[layer.id].failure(Date.now(), definitiveError);
                if (!definitiveError) {
                    window.setTimeout(() => {
                        context.view.notifyChange(false, node);
                    }, node.layerUpdateState[layer.id].secondsUntilNextTry() * 1000);
                }
            }
        });
}
