import RendererConstant from '../Renderer/RendererConstant';
import { l_ELEVATION, l_COLOR, EMPTY_TEXTURE_ZOOM } from '../Renderer/LayeredMaterial';
import { chooseNextLevelToFetch } from '../Core/Layer/LayerUpdateStrategy';
import LayerUpdateState from '../Core/Layer/LayerUpdateState';
import { ImageryLayers } from '../Core/Layer/Layer';
import { CancelledCommandException } from '../Core/Scheduler/Scheduler';
import OGCWebServiceHelper, { SIZE_TEXTURE_TILE } from '../Core/Scheduler/Providers/OGCWebServiceHelper';

function initNodeImageryTexturesFromParent(node, parent, layer) {
    if (parent.materials && parent.materials[RendererConstant.FINAL].getColorLayerLevelById(layer.id) > EMPTY_TEXTURE_ZOOM) {
        const coords = node.getCoordsForLayer(layer);
        const offsetTextures = node.materials[RendererConstant.FINAL].getLayerTextureOffset(layer.id);

        let textureIndex = offsetTextures;
        for (const c of coords) {
            for (const texture of parent.materials[RendererConstant.FINAL].getLayerTextures(l_COLOR, layer.id)) {
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
    if (parent.materials && parent.materials[RendererConstant.FINAL].getElevationLayerLevel() > EMPTY_TEXTURE_ZOOM) {
        const coords = node.getCoordsForLayer(layer);

        const texture = parent.materials[RendererConstant.FINAL].textures[l_ELEVATION][0];
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
    if (!layer.tileInsideLimit(node, layer)) {
        // we also need to check that tile's parent doesn't have a texture for this layer,
        // because even if this tile is outside of the layer, it could inherit it's
        // parent texture
        if (node.parent &&
            node.parent.getIndexLayerColor &&
            node.parent.getIndexLayerColor(layer.id) >= 0) {
            // ok, we're going to inherint our parent's texture
        } else {
            return Promise.resolve();
        }
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

        initNodeImageryTexturesFromParent(node, node.parent, layer);
    }

    if (!node.isDisplayed()) {
        return;
    }

    if (!layer.tileInsideLimit(node, layer)) {
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
    if (!node.isColorLayerDownscaled(layer)) {
        return Promise.resolve();
    }
    // is fetching data from this layer disabled?
    if (!layer.visible || layer.frozen) {
        return Promise.resolve();
    }

    const currentLevel = node.materials[RendererConstant.FINAL].getColorLayerLevelById(layer.id);

    if (currentLevel > EMPTY_TEXTURE_ZOOM) {
        const zoom = node.getCoordsForLayer(layer)[0].zoom || node.level;
        var targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, node, zoom, currentLevel, layer.updateStrategy.options);
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
                window.setTimeout(() => {
                    context.view.notifyChange(false, node);
                }, node.layerUpdateState[layer.id].secondsUntilNextTry() * 1000);
            }
        });
}

export function updateLayeredMaterialNodeElevation(context, layer, node, force) {
    // TODO: we need either
    //  - compound or exclusive layers
    //  - support for multiple elevation layers

    // Elevation is currently handled differently from color layers.
    // This is caused by a LayeredMaterial limitation: only 1 elevation texture
    // can be used (where a tile can have N textures x M layers)
    const ts = Date.now();

    const material = node.materials[RendererConstant.FINAL];
    let currentElevation = material.getElevationLayerLevel();

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
        initNodeElevationTextureFromParent(node, node.parent, layer);
        currentElevation = material.getElevationLayerLevel();
    }
    if (!node.isDisplayed()) {
        return;
    }

    if (!node.layerUpdateState[layer.id].canTryUpdate(ts)) {
        return Promise.resolve();
    }

    const c = node.getCoordsForLayer(layer)[0];
    const zoom = c.zoom || node.level;
    const targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, node, zoom, currentElevation, layer.updateStrategy.options);

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
            node.setTextureElevation(terrain);
        },
        (err) => {
            if (err instanceof CancelledCommandException) {
                node.layerUpdateState[layer.id].success();
            } else {
                node.layerUpdateState[layer.id].failure(Date.now());
                window.setTimeout(() => {
                    context.view.notifyChange(false, node);
                }, node.layerUpdateState[layer.id].secondsUntilNextTry() * 1000);
            }
        });
}
