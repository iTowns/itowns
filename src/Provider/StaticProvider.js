import flatbush from 'flatbush';
import { Vector4 } from 'three';
import Extent from '../Core/Geographic/Extent';
import OGCWebServiceHelper from './OGCWebServiceHelper';
import Fetcher from './Fetcher';
import { l_COLOR, l_ELEVATION } from '../Renderer/LayeredMaterialConstants';

function _selectImagesFromSpatialIndex(index, images, extent) {
    return index.search(
            extent.west(), extent.south(),
            extent.east(), extent.north()).map(i => images[i]);
}

// select the smallest image entirely covering the tile
function selectBestImageForExtent(layer, extent) {
    const candidates =
        _selectImagesFromSpatialIndex(
            layer._spatialIndex, layer.images, extent.as(layer.extent.crs()));

    let selection;
    for (const entry of candidates) {
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

function buildUrl(layer, image) {
    return layer.url.href.substr(0, layer.url.href.lastIndexOf('/') + 1)
        + image;
}

function getTexture(tile, layer, targetLevel) {
    if (!tile.material) {
        return Promise.resolve();
    }

    if (!layer.images) {
        return Promise.reject();
    }

    const original = tile;
    if (targetLevel) {
        while (tile && tile.level > targetLevel) {
            tile = tile.parent;
        }
        if (!tile) {
            return Promise.reject(`Invalid targetLevel requested ${targetLevel}`);
        }
    }

    const selection = selectBestImageForExtent(layer, tile.extent);

    if (!selection) {
        return Promise.reject(
            new Error(`No available image for tile ${tile}`));
    }


    const fn = layer.format.indexOf('image/x-bil') === 0 ?
        OGCWebServiceHelper.getXBilTextureByUrl :
        OGCWebServiceHelper.getColorTextureByUrl;
    return fn(buildUrl(layer, selection.image), layer.networkOptions).then((texture) => {
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

        result.pitch = original.extent.offsetToParent(selection.extent);
        if (layer.transparent) {
            texture.premultiplyAlpha = true;
        }

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
            layer._spatialIndex = flatbush(layer.images.length);
            for (const image of layer.images) {
                layer._spatialIndex.add(
                    image.extent.west(),
                    image.extent.south(),
                    image.extent.east(),
                    image.extent.north());
            }
            layer._spatialIndex.finish();
        }).then(() => {
            if (!layer.format) {
                // fetch the first image to detect format
                if (layer.images.length) {
                    const url = buildUrl(layer, layer.images[0].image);
                    return fetch(url, layer.networkOptions).then((response) => {
                        layer.format = response.headers.get('Content-type');
                        if (layer.format === 'application/octet-stream') {
                            layer.format = 'image/x-bil';
                        }
                        if (!layer.format) {
                            throw new Error(`${layer.name}: could not detect layer format, please configure 'layer.format'.`);
                        }
                    });
                }
            }
        });
    },

    tileInsideLimit(tile, layer) {
        if (!layer.images) {
            return false;
        }

        return _selectImagesFromSpatialIndex(
            layer._spatialIndex, layer.images, tile.extent.as(layer.extent.crs())).length > 0;
    },

    canTileTextureBeImproved(layer, tile) {
        if (!layer.images) {
            return false;
        }
        const s = selectBestImageForExtent(layer, tile.extent);

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
        return getTexture(tile, layer, command.targetLevel);
    },
};
