import { l_ELEVATION, l_COLOR, EMPTY_TEXTURE_ZOOM } from '../Renderer/LayeredMaterialConstants';
import { chooseNextLevelToFetch } from '../Layer/LayerUpdateStrategy';
import LayerUpdateState from '../Layer/LayerUpdateState';
import { ImageryLayers } from '../Layer/Layer';
import CancelledCommandException from '../Core/Scheduler/CancelledCommandException';
import { SIZE_TEXTURE_TILE } from '../Provider/OGCWebServiceHelper';
import computeMinMaxElevation from '../Parser/XbilParser';

// max retry loading before changing the status to definitiveError
const MAX_RETRY = 4;

function getSourceExtent(node, extent, targetLevel, source) {
    if (source && source.getSourceExtents) {
        return source.getSourceExtents(extent).extent;
    } else if (extent.isTiledCrs()) {
        return extent.extentParent(targetLevel);
    } else {
        const parent = node.findAncestorFromLevel(targetLevel);
        if (parent.extent) {
            // Needed to initNodeElevationTextureFromParent, insertSignificantValuesFromParent,
            // isColorLayerDownscaled
            // Must be removed
            parent.extent.zoom = parent.level;
        }
        return parent.extent;
    }
}

function initNodeImageryTexturesFromParent(node, parent, layer) {
    if (parent.material && parent.material.isColorLayerLoaded(layer)) {
        const coords = node.getCoordsForSource(layer.source);
        const offsetTextures = node.material.getLayerTextureOffset(layer.id);

        let textureIndex = offsetTextures;
        for (const c of coords) {
            for (const texture of parent.material.getLayerTextures(layer)) {
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
                console.error(`non-coherent result ${textureIndex} ${offsetTextures} vs ${coords.length}.`, coords);
            }
        }
        const index = node.material.indexOfColorLayer(layer.id);
        node.material.layerTexturesCount[index] = coords.length;
        node.material.loadedTexturesCount[l_COLOR] += coords.length;
    }
}

function initNodeElevationTextureFromParent(node, parent, layer) {
    // Inherit parent's elevation texture. Note that contrary to color layers the elevation level of the
    // node might not be EMPTY_TEXTURE_ZOOM in this init function. That's because we can have
    // multiple elevation layers (thus multiple calls to initNodeElevationTextureFromParent) but a given
    // node can only use 1 elevation texture
    if (parent.material && parent.material.getElevationLayerLevel() > node.material.getElevationLayerLevel()) {
        const coords = node.getCoordsForSource(layer.source);

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
            const { min, max } = computeMinMaxElevation(
                texture.image.data,
                SIZE_TEXTURE_TILE, SIZE_TEXTURE_TILE,
                pitch);
            elevation.min = min;
            elevation.max = max;
        }

        node.setTextureElevation(layer, elevation, pitch);
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
    if (parent.material && parent.material.getElevationLayerLevel() > EMPTY_TEXTURE_ZOOM) {
        const coords = node.getCoordsForSource(layer.source);
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

    // Cancel the command if the tile already has a better texture.
    // This is only needed for elevation layers, because we may have several
    // concurrent layers but we can only use one texture.
    if (cmd.layer.type == 'elevation' &&
        cmd.targetLevel <= cmd.requester.material.getElevationLayerLevel()) {
        return true;
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

export function updateLayeredMaterialNodeImagery(context, layer, node, parent) {
    const material = node.material;
    const extentsDestination = node.getCoordsForSource(layer.source);

    // Initialisation
    if (node.layerUpdateState[layer.id] === undefined) {
        node.layerUpdateState[layer.id] = new LayerUpdateState();

        if (!layer.source.extentsInsideLimit(extentsDestination)) {
            // we also need to check that tile's parent doesn't have a texture for this layer,
            // because even if this tile is outside of the layer, it could inherit it's
            // parent texture
            if (!layer.noTextureParentOutsideLimit &&
                parent &&
                parent.material &&
                parent.material.indexOfColorLayer &&
                parent.material.indexOfColorLayer(layer.id) >= 0) {
                // ok, we're going to inherit our parent's texture
            } else {
                node.layerUpdateState[layer.id].noMoreUpdatePossible();
                return;
            }
        }

        if (material.indexOfColorLayer(layer.id) === -1) {
            material.pushLayer(layer, node.getCoordsForSource(layer.source));
            const imageryLayers = context.view.getLayers(l => l.type === 'color');
            const sequence = ImageryLayers.getColorLayersIdOrderedBySequence(imageryLayers);
            material.setSequence(sequence);

            initNodeImageryTexturesFromParent(node, parent, layer);
        }

        // Proposed new process, two separate processes:
        //      * FIRST PASS: initNodeXXXFromParent and get out of the function
        //      * SECOND PASS: Fetch best texture

        // The two-step allows you to filter out unnecessary requests
        // Indeed in the second pass, their state (not visible or not displayed) can block them to fetch
        const minLevel = layer.source.zoom.min;
        if (node.material.getColorLayerLevelById(layer.id) >= minLevel) {
            context.view.notifyChange(node, false);
            return;
        }
    }

    // Node is hidden, no need to update it
    if (!node.isDisplayed()) {
        return;
    }

    // TODO: move this to defineLayerProperty() declaration
    // to avoid mixing layer's network updates and layer's params
    // Update material parameters
    material.setLayerVisibility(layer, layer.visible);
    material.setLayerOpacity(layer, layer.opacity);

    const ts = Date.now();
    // An update is pending / or impossible -> abort
    if (!layer.visible || !node.layerUpdateState[layer.id].canTryUpdate(ts)) {
        return;
    }

    if (layer.source.canTileTextureBeImproved) {
        // if the layer has a custom method -> use it
        if (!layer.source.canTileTextureBeImproved(node.extent, material.getLayerTextures(layer)[0])) {
            node.layerUpdateState[layer.id].noMoreUpdatePossible();
            return;
        }
    } else if (!material.isColorLayerDownscaled(layer, node.getZoomForLayer(layer))) {
        // default decision method
        node.layerUpdateState[layer.id].noMoreUpdatePossible();
        return;
    }

    // is fetching data from this layer disabled?
    if (layer.frozen) {
        return;
    }

    const failureParams = node.layerUpdateState[layer.id].failureParams;
    const currentLevel = node.material.getColorLayerLevelById(layer.id);
    const nodeLevel = extentsDestination[0].zoom || node.level;
    const targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, node, nodeLevel, currentLevel, layer, failureParams);
    if (targetLevel <= currentLevel) {
        return;
    }

    // Get equivalent of extent destination in source
    const extentsSource = [];
    for (const extentDestination of extentsDestination) {
        const extentSource = getSourceExtent(node, extentDestination, targetLevel, layer.source);
        if (extentSource && !layer.source.extentInsideLimit(extentSource)) {
            // Retry extentInsideLimit because you must check with the targetLevel
            // if the first test extentInsideLimit returns that it is out of limits
            // and the node inherits from its parent, then it'll still make a command to fetch texture.
            node.layerUpdateState[layer.id].noMoreUpdatePossible();
            return;
        }
        extentsSource.push(extentSource);
    }

    const parsedData = node.material.getLayerTextures(layer).map(t => t.parsedData);
    node.layerUpdateState[layer.id].newTry();
    const command = {
        /* mandatory */
        view: context.view,
        layer,
        extentsSource,
        extentsDestination,
        parsedData,
        requester: node,
        priority: nodeCommandQueuePriorityFunction(node),
        earlyDropFunction: refinementCommandCancellationFn,
    };

    return context.scheduler.execute(command).then(
        (result) => {
            if (node.material === null) {
                return;
            }

            if (result) {
                const pitchs = extentsDestination.map((ext, i) => ext.offsetToParent(extentsSource[i]));
                node.material.setLayerTextures(layer, result, pitchs);
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
                    console.warn('Imagery texture update error for', node, err);
                }
                const definitiveError = node.layerUpdateState[layer.id].errorCount > MAX_RETRY;
                node.layerUpdateState[layer.id].failure(Date.now(), definitiveError, { targetLevel });
                if (!definitiveError) {
                    window.setTimeout(() => {
                        context.view.notifyChange(node, false);
                    }, node.layerUpdateState[layer.id].secondsUntilNextTry() * 1000);
                }
            }
        });
}

export function updateLayeredMaterialNodeElevation(context, layer, node, parent) {
    // TODO: we need either
    //  - compound or exclusive layers
    //  - support for multiple elevation layers

    // Elevation is currently handled differently from color layers.
    // This is caused by a LayeredMaterial limitation: only 1 elevation texture
    // can be used (where a tile can have N textures x M layers)
    const material = node.material;
    let currentElevation = material.getElevationLayerLevel();

    // Init elevation layer, and inherit from parent if possible
    if (node.layerUpdateState[layer.id] === undefined) {
        node.layerUpdateState[layer.id] = new LayerUpdateState();
        initNodeElevationTextureFromParent(node, parent, layer);
        currentElevation = material.getElevationLayerLevel();
        const minLevel = layer.source.zoom.min;
        if (currentElevation >= minLevel) {
            context.view.notifyChange(node, false);
            return;
        }
    }

    // Try to update
    const ts = Date.now();

    // Possible conditions to *not* update the elevation texture
    if (layer.frozen ||
            !node.isDisplayed() ||
            !node.layerUpdateState[layer.id].canTryUpdate(ts)) {
        return;
    }

    // Does this tile needs a new texture?
    if (layer.canTileTextureBeImproved) {
        // if the layer has a custom method -> use it
        if (!layer.canTileTextureBeImproved(layer, node)) {
            node.layerUpdateState[layer.id].noMoreUpdatePossible();
            return;
        }
    }

    const extentsDestination = node.getCoordsForSource(layer.source);
    const targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, node, extentsDestination[0].zoom, currentElevation, layer);

    if (targetLevel <= currentElevation) {
        node.layerUpdateState[layer.id].noMoreUpdatePossible();
        return Promise.resolve();
    }

    const extentsSource = [];
    for (const nodeExtent of extentsDestination) {
        const extentSource = getSourceExtent(node, nodeExtent, targetLevel);
        if (extentSource && !layer.source.extentInsideLimit(extentSource)) {
            node.layerUpdateState[layer.id].noMoreUpdatePossible();
            return;
        }
        extentsSource.push(extentSource);
    }

    node.layerUpdateState[layer.id].newTry();

    const command = {
        /* mandatory */
        view: context.view,
        layer,
        extentsSource,
        extentsDestination,
        requester: node,
        priority: nodeCommandQueuePriorityFunction(node),
        earlyDropFunction: refinementCommandCancellationFn,
    };

    return context.scheduler.execute(command).then(
        (textures) => {
            const terrain = { texture: textures[0] };

            // TODO: this check is maybe useless
            // see in dataSourceProvider
            if (node.material === null) {
                return;
            }

            // Do not apply the new texture if its level is < than the current one.
            // This is only needed for elevation layers, because we may have several
            // concurrent layers but we can only use one texture.
            if (targetLevel <= node.material.getElevationLayerLevel()) {
                node.layerUpdateState[layer.id].noMoreUpdatePossible();
                return;
            }

            node.layerUpdateState[layer.id].success();

            if (terrain.texture && terrain.texture.image.data && !checkNodeElevationTextureValidity(terrain.texture, layer.noDataValue)) {
                // Quick check to avoid using elevation texture with no data value
                // If we have no data values, we use value from the parent tile
                // We should later implement multi elevation layer to choose the one to use at each level
                insertSignificantValuesFromParent(terrain.texture, node, parent, layer);
            }

            if (terrain.texture && terrain.texture.image.data) {
                const { min, max } = computeMinMaxElevation(terrain.texture.image.data);
                terrain.min = !min ? 0 : min;
                terrain.max = !max ? 0 : max;
            }
            node.setTextureElevation(layer, terrain, extentsDestination[0].offsetToParent(extentsSource[0]));
        },
        (err) => {
            if (err instanceof CancelledCommandException) {
                node.layerUpdateState[layer.id].success();
            } else {
                if (__DEBUG__) {
                    console.warn('Elevation texture update error for', node, err);
                }
                const definitiveError = node.layerUpdateState[layer.id].errorCount > MAX_RETRY;
                node.layerUpdateState[layer.id].failure(Date.now(), definitiveError);
                if (!definitiveError) {
                    window.setTimeout(() => {
                        context.view.notifyChange(node, false);
                    }, node.layerUpdateState[layer.id].secondsUntilNextTry() * 1000);
                }
            }
        });
}
