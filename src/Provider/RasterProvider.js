/**
 * Class: RasterProvider
 * Description: Provides textures from a vector data
 */

import * as THREE from 'three';
import Extent from '../Core/Geographic/Extent';
import Feature2Texture from '../Renderer/ThreeExtended/Feature2Texture';
import Fetcher from './Fetcher';

const cache = new Map();

export default {
    preprocessDataLayer(layer, view, scheduler, parentLayer) {
        if (!layer.url) {
            throw new Error('layer.url is required');
        }

        // KML and GPX specifications all says that they should be in
        // EPSG:4326. We still support reprojection for them through this
        // configuration option
        layer.projection = layer.projection || 'EPSG:4326';
        const parentCrs = parentLayer.extent.crs();

        if (!(layer.extent instanceof Extent)) {
            layer.extent = new Extent(layer.projection, layer.extent).as(parentCrs);
        }

        if (!layer.options.zoom) {
            layer.options.zoom = { min: 5, max: 21 };
        }

        layer.style = layer.style || {};

        // Rasterization of data vector
        // It shouldn't use parent's texture outside its extent
        // Otherwise artefacts appear at the outer edge
        layer.noTextureParentOutsideLimit = true;

        cache.set(layer.id, {
            buildExtent: true,
            crsIn: layer.projection,
            crsOut: parentCrs,
            filteringExtent: layer.extent,
        });
    },
    tileInsideLimit(tile, layer) {
        return tile.level >= layer.options.zoom.min && tile.level <= layer.options.zoom.max && layer.extent.intersectsExtent(tile.extent);
    },
    executeCommand(command) {
        const layer = command.layer;
        const tile = command.requester;
        const options = cache.get(layer.id);

        let fetchType;
        switch (layer.format) {
            case 'geojson':
                fetchType = 'json';
                break;
            default:
                fetchType = 'xml';
                break;
        }

        return Fetcher[fetchType](layer.url, layer.networkOptions).then(blob => ({
            content: blob,
            options,
            callback: (feature) => {
                if (feature) {
                    layer.feature = feature;
                    layer.extent = feature.extent;
                }

                if (layer.type == 'color') {
                    const coords = tile.extent;
                    const result = { pitch: new THREE.Vector4(0, 0, 1, 1) };
                    result.texture = Feature2Texture.createTextureFromFeature(layer.feature, tile.extent, 256, layer.style);
                    result.texture.extent = tile.extent;
                    result.texture.coords = coords;
                    result.texture.coords.zoom = tile.level;

                    if (layer.transparent) {
                        result.texture.premultiplyAlpha = true;
                    }
                    return Promise.resolve(result);
                } else {
                    return Promise.resolve();
                }
            },
        }));
    },
};
