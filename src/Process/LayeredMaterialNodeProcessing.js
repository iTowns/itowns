import RendererConstant from 'Renderer/RendererConstant';
import { chooseNextLevelToFetch } from 'Scene/LayerUpdateStrategy';
import { l_ELEVATION, l_COLOR } from 'Renderer/LayeredMaterial';
import LayerUpdateState from 'Scene/LayerUpdateState';
import { CancelledCommandException } from 'Core/Commander/Scheduler';

function findAncestorWithValidTextureForLayer(node, parent, layerType, layer) {
    if (parent && parent.material && parent.material.getLayerLevel) {
        var level = parent.material.getLayerLevel(layerType, layer ? layer.id : undefined);
        if (level >= 0) {
            return parent.getNodeAtLevel(level);
        } else {
            return findAncestorWithValidTextureForLayer(parent, parent.parent, layerType, layer);
        }
    } else {
        return null;
    }
}

function nodeCommandQueuePriorityFunction(node) {
    // We know that 'node' is visible because commands can only be
    // issued for visible nodes.
    //
    if (!node.loaded) {
        // Prioritize lower-level (ie: bigger) non-loaded nodes
        // because we need them to be loaded to be able
        // to subdivide.
        return 1000 - node.level;
    } else if (node.isDisplayed()) {
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

    // allow cancellation of the command if the node isn't visible anymore
    return cmd.requester.visible === false &&
        cmd.requester.level >= 2;
}

function initLayeredMaterialImageryLayer(node, imageryLayer) {
    // create update control object
    node.layerUpdateState[imageryLayer.id] = new LayerUpdateState();

    // init LayeredMaterial attributes
    const texturesCount =
        imageryLayer.tileTextureCount ? imageryLayer.tileTextureCount(node, imageryLayer) : 1;

    node.material.pushLayer({
        tileMT: imageryLayer.options.tileMatrixSet,
        texturesCount,
        visible: true, // TODO params.layersConfig.isColorLayerVisible(layer.id),
        opacity: 1.0, // TODO params.layersConfig.getColorLayerOpacity(layer.id),
        fx: imageryLayer.fx,
        idLayer: imageryLayer.id,
    });

    node.layerUpdateState[imageryLayer.id].texturesCount = texturesCount;
}

export function initNewNode(context, parent, node) {
    const promises = [];

    const imageryLayers = context.scene.layersConfiguration.getLayers((layer, attr) => attr.type == 'color');

    for (const imageryLayer of imageryLayers) {
        promises.push(_updateLayeredMaterialNodeImagery(context, imageryLayer, node, parent));
    }

    const elevationLayers = context.scene.layersConfiguration.getLayers((layer, attr) => attr.type == 'elevation');
    for (const elevationLayer of elevationLayers) {
        promises.push(_updateLayeredMaterialNodeElevation(context, elevationLayer, node, parent));
    }

    return Promise.all(promises).then(() => { node.loaded = true; });
}

export function updateLayeredMaterialNodeImagery(context, layer, node) {
    _updateLayeredMaterialNodeImagery(context, layer, node);
}

function _updateLayeredMaterialNodeImagery(context, layer, node, parent) {
    // upate params
    const layerIndex = node.material.indexOfColorLayer(layer.id);
    node.material.setLayerVisibility(layerIndex, context.scene.layersConfiguration.getLayerAttribute(layer.id, 'visible'));
    node.material.setLayerOpacity(layerIndex, context.scene.layersConfiguration.getLayerAttribute(layer.id, 'opacity'));

    const ts = Date.now();

    // is tile covered by this layer?
    // We test early (rather than after chooseNextLevelToFetch like elevation)
    // because colorParams only exist for tiles where tileInsideLimit is true
    // (see `subdivideNode`)
    if (!layer.tileInsideLimit(node, layer)) {
        return;
    }

    const force = node.layerUpdateState[layer.id] === undefined;
    if (force) {
        initLayeredMaterialImageryLayer(node, layer);
    }

    if (!node.layerUpdateState[layer.id].canTryUpdate(ts)) {
        return;
    }

    // TODO: determine force given node state?
    if (!force) {
        // does this tile needs a new texture?
        if (!node.isColorLayerDownscaled(layer.id)) {
            return;
        }
        // is fetching data from this layer disabled?
        // TODO
        /*
        if (!layersConfig.isColorLayerVisible(layer.id) ||
            layersConfig.isLayerFrozen(layer.id)) {
            return;
        }
        */
    }

    let ancestor = null;

    const currentLevel = node.materials[RendererConstant.FINAL].getColorLayerLevelById(layer.id);
    // if this tile has no texture (level == -1), try use one from an ancestor
    if (currentLevel === -1) {
        ancestor = findAncestorWithValidTextureForLayer(node, parent || node.parent, l_COLOR, layer);
    } else {
        var targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, node.level, currentLevel, layer.updateStrategy.options);
        if (targetLevel === currentLevel) {
            return;
        }
        if (targetLevel < node.level) {
            ancestor = node.getNodeAtLevel(targetLevel);
        }
    }

    node.layerUpdateState[layer.id].newTry();

    const command = {
        /* mandatory */
        layer,
        requester: node,
        priority: nodeCommandQueuePriorityFunction(node),
        earlyDropFunction: force ? null : refinementCommandCancellationFn,
        /* specific params */
        ancestor,
        redraw: !force,
    };

    return context.scheduler.execute(command).then(
        (result) => {
            if (node.material === null) {
                return;
            }
            if (!result) {
                // shouldn't happen
                // eslint-disable-next-line no-console
                console.warn(`Invalid value received. Probably a bug in the provider (${layer.protocol})`);
                return;
            }

            const level = ancestor ? ancestor.level : node.level;
            // Assign .level to texture
            if (Array.isArray(result)) {
                for (let j = 0; j < result.length; j++) {
                    result[j].texture.level = level;
                }

                node.setTexturesLayer(result, l_COLOR, layer.id);
            } else if (result.texture) {
                result.texture.level = level;
                node.setTexturesLayer([result], l_COLOR, layer.id);
            }

            node.layerUpdateState[layer.id].success();

            return result;
        },
        (err) => {
            if (err instanceof CancelledCommandException) {
                node.layerUpdateState[layer.id].success();
            } else {
                node.layerUpdateState[layer.id].failure(Date.now());
                // TODO event
                context.scene.notifyChange(node.layerUpdateState[layer.id].secondsUntilNextTry() * 1000, false);
            }
        });
}

export function updateLayeredMaterialNodeElevation(context, layer, node) {
    _updateLayeredMaterialNodeElevation(context, layer, node);
}

function _updateLayeredMaterialNodeElevation(context, layer, node, parent) {
    // TODO: we need either
    //  - compound or exclusive layers
    //  - support for multiple elevation layers

    // Elevation is currently handled differently from color layers.
    // This is caused by a LayeredMaterial limitation: only 1 elevation texture
    // can be used (where a tile can have N textures x M layers)
    const ts = Date.now();
    let ancestor = null;

    const currentElevation = node.materials[RendererConstant.FINAL].getElevationLayerLevel();

    // Step 0: currentElevevation is -1 BUT material.loadedTexturesCount[l_ELEVATION] is > 0
    // means that we already tried and failed to download an elevation texture
    if (currentElevation == -1 && node.material.loadedTexturesCount[l_ELEVATION] > 0) {
        return;
    }

    // First step: if currentElevation is empty (level is -1), we *must* use the texture from
    // one of our parent. This allows for smooth transitions when subdividing
    // We don't care about layer status (isLayerFrozen) or limits (tileInsideLimit) because
    // we simply want to use ancestor's texture with a different pitch
    if (currentElevation == -1) {
        ancestor = findAncestorWithValidTextureForLayer(node, parent || node.parent, l_ELEVATION);
    }

    // We don't have a texture to reuse. This can happen in two cases:
    //   * no ancestor texture to use
    //   * we already have 1 texture (so currentElevation >= 0)
    // Again, LayeredMaterial's 1 elevation texture limitation forces us to `break` as soon
    // as one layer can supply a texture for this node. So ordering of elevation layers is important.
    // Ordering way of loop is important to find the best layer with tileInsideLimit
    if (!layer.tileInsideLimit(node, layer)) {
        return;
    }

    // TODO
    const force = (node.layerUpdateState[layer.id] === undefined);

    // if (layersConfig.isLayerFrozen(layer.id) && !force) {
    //     return;
    // }

    if (node.layerUpdateState[layer.id] === undefined) {
        node.layerUpdateState[layer.id] = new LayerUpdateState();
    }

    if (!node.layerUpdateState[layer.id].canTryUpdate(ts)) {
        return;
    }

    const targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, node.level, currentElevation, layer.updateStrategy.options);

    if (targetLevel <= currentElevation) {
        return;
    }

    // ancestor is not enough: we also need to know from which layer we're going to request the elevation texture (see how this is done for color texture).
    // Right now this is done in the `for` loop below but this is hacky because there's no real warranty that bestLayer and ancestor really match.
    // FIXME: we need to be able to set both ancestor and bestLayer at the same time
    if (ancestor === null) {
        ancestor = node.getNodeAtLevel(targetLevel);
    }


    node.layerUpdateState[layer.id].newTry();

    const command = {
        /* mandatory */
        layer,
        requester: node,
        priority: nodeCommandQueuePriorityFunction(node),
        earlyDropFunction: force ? null : refinementCommandCancellationFn,
        /* specific params */
        ancestor,
        redraw: !force,
    };

    return context.scheduler.execute(command).then(
        (terrain) => {
            node.layerUpdateState[layer.id].success();

            if (node.material === null) {
                return;
            }

            if (terrain.texture) {
                terrain.texture.level = (ancestor || node).level;
            }

            terrain.min = 0;
            terrain.max = 255;
            if (terrain.max === undefined) {
                terrain.min = (ancestor || node).bbox.bottom();
                terrain.max = (ancestor || node).bbox.top();
            }

            node.setTextureElevation(terrain);
        },
        (err) => {
            if (err instanceof CancelledCommandException) {
                node.layerUpdateState[layer.id].success();
            } else {
                node.layerUpdateState[layer.id].failure(Date.now());
                context.scene.notifyChange(node.layerUpdateState[layer.id].secondsUntilNextTry() * 1000, false);
            }
        });
}
