import RendererConstant from '../Renderer/RendererConstant';
import { l_ELEVATION, l_COLOR, EMPTY_TEXTURE_ZOOM } from '../Renderer/LayeredMaterial';
import { chooseNextLevelToFetch } from '../Core/Layer/LayerUpdateStrategy';
import LayerUpdateState from '../Core/Layer/LayerUpdateState';
import { ImageryLayers } from '../Core/Layer/Layer';
import { CancelledCommandException } from '../Core/Scheduler/Scheduler';
import OGCWebServiceHelper, { SIZE_TEXTURE_TILE } from '../Core/Scheduler/Providers/OGCWebServiceHelper';

function initNodeImageryTexturesFromParent(node, parent, layer) {
    if (parent.material && parent.material.getColorLayerLevelById(layer.id) > EMPTY_TEXTURE_ZOOM) {
        const coords = node.getCoordsForLayer(layer);
        const offsetTextures = node.material.getLayerTextureOffset(layer.id);

        let textureIndex = offsetTextures;
        for (const c of coords) {
            for (const texture of parent.materials[0].getLayerTextures(l_COLOR, layer.id)) {
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
        const index = node.material.colorLayersId.length - 1;
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
        // If the texture resolution has a poor precision for this node, we don't
        // extract min-max from the texture (too few information), we instead chose
        // to use parent's min-max.
        const useMinMaxFromParent = node.level - texture.coords.zoom > 6;

        const { min, max } = useMinMaxFromParent ?
        {
            min: parent.OBB().z.min,
            max: parent.OBB().z.max,
        } : OGCWebServiceHelper.ioDXBIL.computeMinMaxElevation(
            texture.image.data,
            SIZE_TEXTURE_TILE, SIZE_TEXTURE_TILE,
            pitch);

        const elevation = {
            texture,
            pitch,
            min,
            max,
        };

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
    if (!node.isDisplayed()) {
        return;
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

    // upate params
    const layerIndex = material.indexOfColorLayer(layer.id);
    material.setLayerVisibility(layerIndex, layer.visible);
    material.setLayerOpacity(layerIndex, layer.opacity);

    const ts = Date.now();

    // OGCWebServiceHelper.computeTileMatrixSetCoordinates(node, layer.options.tileMatrixSet);

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
        const zoom = node.getCoordsForLayer(layer).zoom || node.level;
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
        initNodeElevationTextureFromParent(node, node.parent, layer);
    }

    if (!node.layerUpdateState[layer.id].canTryUpdate(ts)) {
        return Promise.resolve();
    }

    // OGCWebServiceHelper.computeTileMatrixSetCoordinates(node, layer.options.tileMatrixSet);

    const c = node.getCoordsForLayer(layer);
    const zoom = c.zoom || node.level;
    const targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, zoom, currentElevation, layer.updateStrategy.options);

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

/* TODO
            if (terrain.texture) {
                terrain.texture.level = (ancestor || node).level;
            }

            terrain.min = 0;
            terrain.max = 255;
            if (terrain.max === undefined) {
                terrain.min = (ancestor || node).bbox.bottom();
                terrain.max = (ancestor || node).bbox.top();
            }
*/

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
