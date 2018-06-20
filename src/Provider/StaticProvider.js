import flatbush from 'flatbush';
import { Vector4 } from 'three';
import Extent from '../Core/Geographic/Extent';
import OGCWebServiceHelper from './OGCWebServiceHelper';
import Fetcher from './Fetcher';

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

function getTexture(toDownload, layer) {
    const fn = layer.format.indexOf('image/x-bil') === 0 ?
        OGCWebServiceHelper.getXBilTextureByUrl :
        OGCWebServiceHelper.getColorTextureByUrl;
    return fn(toDownload.url, layer.networkOptions).then((texture) => {
        // adjust pitch
        const result = {
            texture,
            pitch: new Vector4(0, 0, 1, 1),
        };

        result.texture.extent = toDownload.selection.extent;
        result.texture.file = toDownload.selection.image;

        result.pitch = toDownload.pitch;
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

    canTextureBeImproved(layer, extents, currentTextures) {
        if (!layer.images) {
            return;
        }
        const s = selectBestImageForExtent(layer, extents[0]);

        if (!s) {
            return;
        }
        if (currentTextures && currentTextures[0].file != s.image) {
            return [{
                selection: s,
                pitch: extents[0].offsetToParent(s.extent),
                url: buildUrl(layer, s.image),
            }];
        }
    },

    executeCommand(command) {
        const layer = command.layer;
        return getTexture(command.toDownload[0], layer);
    },
};
