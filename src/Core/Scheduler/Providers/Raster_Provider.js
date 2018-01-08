/**
 * Class: Raster_Provider
 * Description: Provides textures from a vector data
 */


import * as THREE from 'three';
import togeojson from 'togeojson';
import Extent from '../../Geographic/Extent';
import Feature2Texture from '../../../Renderer/ThreeExtended/Feature2Texture';
import GeoJSON2Features from '../../../Renderer/ThreeExtended/GeoJSON2Features';
import Fetcher from './Fetcher';

const supportedFormats = [
    'vector/kml',
    'vector/gpx',
    'vector/geojson',
];

const fetcher = {
    'vector/kml': Fetcher.xml,
    'vector/gpx': Fetcher.xml,
    'vector/geojson': Fetcher.json,
};

function getExtension(path) {
    path = String(path);
    const basename = path.split(/[\\/]/).pop();
    const pos = basename.lastIndexOf('.');
    if (basename === '' || pos < 1) {
        return '';
    }
    return basename.slice(pos + 1);
}

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
        const coords = tile.extent.as(layer.projection);
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
    preprocessDataLayer(layer) {
        if (!layer.url) {
            throw new Error('layer.url is required');
        }

        const extention = getExtension(layer.url).toLowerCase();
        const format = `vector/${extention}`;
        layer.options = layer.options || {};

        if (!supportedFormats.includes(format) && !layer.options.mimetype) {
            return Promise.reject(new Error('layer.options.mimetype is required'));
        } else {
            return fetcher[format](layer.url).then((file) => {
                // Know if it's an xml file, then it can be kml or gpx
                if (file.getElementsByTagName) {
                    if (file.getElementsByTagName('kml')[0]) {
                        layer.options.mimetype = 'vector/kml';
                        // KML crs specification : 'EPSG:4326'
                        layer.projection = layer.projection || 'EPSG:4326';
                    } else if (file.getElementsByTagName('gpx')[0]) {
                        // GPX crs specification : 'EPSG:4326'
                        layer.options.mimetype = 'vector/gpx';
                        layer.projection = layer.projection || 'EPSG:4326';
                    } else {
                        throw new Error('Unsupported xml file data vector');
                    }
                // Know if it's an geojson file
                } else if (file.type == 'Feature' || file.type == 'FeatureCollection') {
                    layer.options.mimetype = 'vector/geojson';
                } else {
                    throw new Error('Unsupported json file data vector');
                }

                if (!(layer.extent instanceof Extent)) {
                    layer.extent = new Extent(layer.projection, layer.extent);
                }

                if (!layer.options.zoom) {
                    layer.options.zoom = { min: 5, max: 21 };
                }

                layer.format = layer.options.mimetype;
                layer.style = layer.style || {};

                // Rasterization of data vector
                // It shouldn't use parent's texture outside the extent
                // Otherwise artefacts appear at the outer edge
                layer.noTextureParentOutsideLimit = true;
                const options = { buildExtent: true, crsIn: layer.projection };

                if (layer.options.mimetype === 'vector/geojson') {
                    layer.feature = GeoJSON2Features.parse(layer.reprojection, file, layer.extent, options);
                    layer.extent = layer.feature.extent || layer.feature.geometry.extent;
                } else if (layer.options.mimetype === 'vector/kml') {
                    const geojson = togeojson.kml(file);
                    layer.feature = GeoJSON2Features.parse(layer.reprojection, geojson, layer.extent, options);
                    layer.extent = layer.feature.extent;
                } else if (layer.options.mimetype === 'vector/gpx') {
                    const geojson = togeojson.gpx(file);
                    layer.style.stroke = layer.style.stroke || 'red';
                    layer.extent = getExtentFromGpxFile(file);
                    layer.feature = GeoJSON2Features.parse(layer.reprojection, geojson, layer.extent, options);
                    layer.extent = layer.feature.extent;
                }
                // GeoJSON2Features.parse reprojects in local tile texture space
                // Rasterizer gives textures in this new reprojection space
                // layer.projection is now reprojection
                layer.originalprojection = layer.projection;
                layer.projection = layer.reprojection;
            });
        }
    },
    tileInsideLimit(tile, layer) {
        return tile.level >= layer.options.zoom.min && tile.level <= layer.options.zoom.max && layer.extent.intersectsExtent(tile.extent);
    },
    executeCommand(command) {
        const layer = command.layer;
        if (!supportedFormats.includes(layer.format)) {
            return Promise.reject(new Error(`Unsupported mimetype ${layer.format}`));
        }
        const tile = command.requester;

        return createTextureFromVector(tile, layer);
    },
};
