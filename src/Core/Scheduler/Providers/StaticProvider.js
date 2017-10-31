import { Vector4 } from 'three';
import Extent from '../../Geographic/Extent';
import OGCWebServiceHelper from './OGCWebServiceHelper';
import Fetcher from './Fetcher';
import { l_COLOR, l_ELEVATION } from '../../../Renderer/LayeredMaterialConstants';

// select the smallest image entirely covering the tile
function selectBestImageForExtent(images, extent) {
    let selection;
    for (const entry of images) {
        if (extent.isInside(entry.extent)) {
            if (!selection) {
                selection = entry;
            } else {
                const d = selection.extent.dimensions();
                const e = entry.extent.dimensions();
                if (e.x <= d.x && e.y <= d.y) {
                    selection = entry;
                }
            }
        }
    }
    return selection;
}

function getTexture(tile, layer) {
    if (!layer.tileInsideLimit(tile, layer)) {
        return Promise.reject(`Tile '${tile}' is outside layer bbox ${layer.extent}`);
    }
    if (!tile.material) {
        return Promise.resolve();
    }

    if (!layer.images) {
        return Promise.reject();
    }

    const selection = selectBestImageForExtent(layer.images, tile.extent);

    if (!selection) {
        return Promise.reject(
            new Error(`No available image for tile ${tile}`));
    }

    const url = layer.url.href.substr(0, layer.url.href.lastIndexOf('/') + 1) + selection.image;
    const fn = layer.type === 'color' ? OGCWebServiceHelper.getColorTextureByUrl : OGCWebServiceHelper.getXBilTextureByUrl;
    return fn(url, layer.networkOptions).then((texture) => {
        // adjust pitch
        const result = {
            texture,
            pitch: new Vector4(0, 0, 1, 1),
        };

        result.texture.extent = selection.extent;
        result.texture.coords = selection.extent;
        if (!result.texture.coords.zoom || result.texture.coords.zoom > tile.level) {
            result.texture.coords.zoom = tile.level;
            result.texture.file = selection.image;
        }
        // TODO: modify TileFS to handle tiles with ratio != image's ratio
        result.pitch = tile.extent.offsetToParent(selection.extent);


        return result;
    });
}


/**
 * This provider uses no protocol but instead download static images directly.
 *
 * It uses as input 'image_filename: extent' values and then tries to find the best image
 * for a given tile using the extent property.
 */
export default {
    preprocessDataLayer(layer) {
        if (!layer.extent) {
            throw new Error('layer.extent is required');
        }

        if (!(layer.extent instanceof Extent)) {
            layer.extent = new Extent(layer.projection, ...layer.extent);
        }

        layer.options = {};
        layer.canTileTextureBeImproved = this.canTileTextureBeImproved;
        layer.url = new URL(layer.url, window.location);
        return Fetcher.json(layer.url.href).then((metadata) => {
            layer.images = [];
            // eslint-disable-next-line guard-for-in
            for (const image in metadata) {
                const extent = new Extent(layer.projection, ...metadata[image]);
                layer.images.push({
                    image,
                    extent,
                });
            }
        });
    },

    tileInsideLimit(tile, layer) {
        if (!layer.images) {
            return false;
        }
        // images search is quite costly so let's try to take a shortcut
        if (layer.id in tile.layerUpdateState) {
            return true;
        }

        for (const entry of layer.images) {
            if (tile.extent.isInside(entry.extent)) {
                return true;
            }
        }

        return false;
    },

    canTileTextureBeImproved(layer, tile) {
        if (!layer.images) {
            return false;
        }
        const s = selectBestImageForExtent(layer.images, tile.extent);
        if (!s) {
            return false;
        }
        const mat = tile.material;
        const layerType = layer.type === 'color' ? l_COLOR : l_ELEVATION;
        const currentTexture = mat.getLayerTextures(layerType, layer.id)[0];
        if (!currentTexture.file) {
            return true;
        }
        return currentTexture.file != s.image;
    },

    executeCommand(command) {
        const tile = command.requester;
        const layer = command.layer;
        return getTexture(tile, layer);
    },
};
