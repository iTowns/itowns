/**
 * Class: RasterProvider
 * Description: Provides textures from a vector data
 */


import * as THREE from 'three';
import togeojson from 'togeojson';
import Extent from '../Core/Geographic/Extent';
import Feature2Texture from '../Renderer/ThreeExtended/Feature2Texture';
import GeoJsonParser from '../Parser/GeoJsonParser';
import Fetcher from './Fetcher';

function getExtentFromGpxFile(file) {
    const bound = file.getElementsByTagName('bounds')[0];
    if (bound) {
        const west = bound.getAttribute('minlon');
        const east = bound.getAttribute('maxlon');
        const south = bound.getAttribute('minlat');
        const north = bound.getAttribute('maxlat');
        return new Extent('EPSG:4326', west, east, south, north);
    }
    return new Extent('EPSG:4326', -180, 180, -90, 90);
}

function createTextureFromVector(tile, layer) {
    if (!tile.material) {
        return Promise.resolve();
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
}

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

        return Fetcher.text(layer.url, layer.networkOptions).then((text) => {
            let geojson;
            const trimmedText = text.trim();
            // We test the start of the string to choose a parser
            if (trimmedText.startsWith('<')) {
                // if it's an xml file, then it can be kml or gpx
                const parser = new DOMParser();
                const file = parser.parseFromString(text, 'application/xml');
                if (file.documentElement.tagName.toLowerCase() === 'kml') {
                    geojson = togeojson.kml(file);
                } else if (file.documentElement.tagName.toLowerCase() === 'gpx') {
                    geojson = togeojson.gpx(file);
                    layer.style.stroke = layer.style.stroke || 'red';
                    layer.extent = layer.extent.intersect(getExtentFromGpxFile(file).as(layer.extent.crs()));
                } else if (file.documentElement.tagName.toLowerCase() === 'parsererror') {
                    throw new Error('Error parsing XML document');
                } else {
                    throw new Error('Unsupported xml file, only valid KML and GPX are supported, but no <gpx> or <kml> tag found.',
                            file);
                }
            } else if (trimmedText.startsWith('{') || trimmedText.startsWith('[')) {
                geojson = JSON.parse(text);
                if (geojson.type !== 'Feature' && geojson.type !== 'FeatureCollection') {
                    throw new Error('This json is not a GeoJSON');
                }
            } else {
                throw new Error('Unsupported file: only well-formed KML, GPX or GeoJSON are supported');
            }

            if (geojson) {
                const options = {
                    buildExtent: true,
                    crsIn: layer.projection,
                    crsOut: parentCrs,
                    filteringExtent: layer.extent,
                };

                return GeoJsonParser.parse(geojson, options);
            }
        }).then((feature) => {
            if (Array.isArray(feature) && feature.length == 0) {
                return;
            }
            if (feature) {
                layer.feature = feature;
                layer.extent = feature.extent;
            }
        });
    },
    canTextureBeImproved(layer, extents, currentTextures) {
        if (!currentTextures || !currentTextures[0].extent) {
            return true;
        }
        const dim = extents[0].dimensions();
        const inside = currentTextures[0].extent.isInside(extents[0], dim.x * 0.001);
        return !inside;
    },
    tileInsideLimit(tile, layer) {
        const extent = tile.getCoordsForLayer(layer)[0];
        return layer.extent.intersectsExtent(extent);
    },
    executeCommand(command) {
        const layer = command.layer;
        const tile = command.requester;

        return createTextureFromVector(tile, layer);
    },
};
