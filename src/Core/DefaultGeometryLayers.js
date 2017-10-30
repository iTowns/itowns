import * as THREE from 'three';

import { GeometryLayer } from './Layer/Layer';
import { processTiledGeometryNode } from '../Process/TiledNodeProcessing';
import SubdivisionControl from '../Process/SubdivisionControl';

import { globeCulling, preGlobeUpdate, globeSubdivisionControl, globeSchemeTileWMTS, globeSchemeTile1 } from '../Process/GlobeTileProcessing';
import BuilderEllipsoidTile from './Prefab/Globe/BuilderEllipsoidTile';

import { planarCulling, planarSubdivisionControl } from '../Process/PlanarTileProcessing';
import PlanarTileBuilder from './Prefab/Planar/PlanarTileBuilder';

import { process3dTilesNode, $3dTilesCulling, $3dTilesSubdivisionControl, pre3dTilesUpdate } from '../Process/3dTilesProcessing';

function _commonAncestorLookup(a, b) {
    if (!a || !b) {
        return undefined;
    }
    if (a.level == b.level) {
        if (a.id == b.id) {
            return a;
        } else if (a.level != 0) {
            return _commonAncestorLookup(a.parent, b.parent);
        } else {
            return undefined;
        }
    } else if (a.level < b.level) {
        return _commonAncestorLookup(a, b.parent);
    } else {
        return _commonAncestorLookup(a.parent, b);
    }
}

function _tiledNodeInitFunction(layer, parent, node) {
    node.material.setLightingOn(layer.lighting.enable);
    node.material.uniforms.lightPosition.value = layer.lighting.position;

    if (layer.noTextureColor) {
        node.material.uniforms.noTextureColor.value.copy(layer.noTextureColor);
    }

    if (__DEBUG__) {
        node.material.uniforms.showOutline = { value: layer.showOutline || false };
        node.material.wireframe = layer.wireframe || false;
    }
}

function _tiledPreUpdate(preUpdateSpecialisation) {
    return function _(context, layer, changeSources) {
        SubdivisionControl.preUpdate(context, layer);

        if (__DEBUG__) {
            layer._latestUpdateStartingLevel = 0;
        }

        if (preUpdateSpecialisation) {
            preUpdateSpecialisation(context, layer);
        }
        if (changeSources.has(undefined) || changeSources.size == 0) {
            return layer.level0Nodes;
        }

        let commonAncestor;
        for (const source of changeSources.values()) {
            if (source.isCamera) {
                // if the change is caused by a camera move, no need to bother
                // to find common ancestor: we need to update the whole tree:
                // some invisible tiles may now be visible
                return layer.level0Nodes;
            }
            if (source.layer === layer.id) {
                if (!commonAncestor) {
                    commonAncestor = source;
                } else {
                    commonAncestor = _commonAncestorLookup(commonAncestor, source);
                    if (!commonAncestor) {
                        return layer.level0Nodes;
                    }
                }
                if (commonAncestor.material == null) {
                    commonAncestor = undefined;
                }
            }
        }
        if (commonAncestor) {
            if (__DEBUG__) {
                layer._latestUpdateStartingLevel = commonAncestor.level;
            }
            return [commonAncestor];
        } else {
            return layer.level0Nodes;
        }
    };
}

/**
 * Creates a Globe geometry, which can be used to draw other layers (color, elevation, ...)
 *
 * @function
 * @param {string} id - identifer (must be unique amongst all layers id)
 * @param {Object} [options]
 * @param {Object} [options.object3d=THREE.Group] - The THREE.Object3D that will be the parent of all Object3D built
 * by this layer
 * @param {number} [options.maxSubdivisionLevel=17] - The geometry subdivision max depth
 *
 * @return {GeometryLayer} a GeometryLayer preconfigured to display a globe.
 * The returned instance implements the {@link CanDisplayColorLayer},
 * {@link CanDisplayElevationLayer} and {@link CanDisplayFeatureLayer} interfaces.
 */
export function createGlobe(id, options = {}) {
    // Configure tiles
    const wgs84TileLayer = new GeometryLayer(id, options.object3d || new THREE.Group());
    wgs84TileLayer.schemeTile = globeSchemeTileWMTS(globeSchemeTile1);
    wgs84TileLayer.extent = wgs84TileLayer.schemeTile[0].clone();
    for (let i = 1; i < wgs84TileLayer.schemeTile.length; i++) {
        wgs84TileLayer.extent.union(wgs84TileLayer.schemeTile[i]);
    }
    wgs84TileLayer.preUpdate = _tiledPreUpdate(preGlobeUpdate);

    function subdivision(context, layer, node) {
        if (SubdivisionControl.hasEnoughTexturesToSubdivide(context, layer, node)) {
            return globeSubdivisionControl(2, options.maxSubdivisionLevel || 17, options.sseSubdivisionThreshold || 1.0)(context, layer, node);
        }
        return false;
    }

    wgs84TileLayer.update = processTiledGeometryNode(globeCulling(2), subdivision);
    wgs84TileLayer.builder = new BuilderEllipsoidTile();
    wgs84TileLayer.onTileCreated = _tiledNodeInitFunction;
    wgs84TileLayer.type = 'geometry';
    wgs84TileLayer.protocol = 'tile';
    wgs84TileLayer.visible = true;
    wgs84TileLayer.lighting = {
        enable: false,
        position: { x: -0.5, y: 0.0, z: 1.0 },
    };

    return wgs84TileLayer;
}

/**
 * Creates a planar geometry, which can be used to draw other layers (color, elevation, ...)
 *
 * @function
 * @param {string} id - identifer (must be unique amongst all layers id)
 * @param {Extent} extent - the extent of the planar geometry
 * @param {Object} [options]
 * @param {Object} [options.object3d=THREE.Group] - The THREE.Object3D that will be the parent of all Object3D built
 * by this layer
 * @param {number} [options.maxSubdivisionLevel=5] - The geometry subdivision max depth
 *
 * @return {GeometryLayer} a GeometryLayer preconfigured to display a planar extent.
 * The returned instance implements the {@link CanDisplayColorLayer},
 * {@link CanDisplayElevationLayer} and {@link CanDisplayFeatureLayer} interfaces.
 */
export function createPlane(id, extent, options) {
    const tileLayer = new GeometryLayer(id, options.object3d || new THREE.Group());
    tileLayer.extent = extent;
    tileLayer.schemeTile = [extent];

    tileLayer.preUpdate = _tiledPreUpdate();

    function subdivision(context, layer, node) {
        if (SubdivisionControl.hasEnoughTexturesToSubdivide(context, layer, node)) {
            return planarSubdivisionControl(options.maxSubdivisionLevel || 5)(context, layer, node);
        }
        return false;
    }

    tileLayer.update = processTiledGeometryNode(planarCulling, subdivision);
    tileLayer.builder = new PlanarTileBuilder();
    tileLayer.onTileCreated = _tiledNodeInitFunction;
    tileLayer.type = 'geometry';
    tileLayer.protocol = 'tile';
    tileLayer.visible = true;
    tileLayer.lighting = {
        enable: false,
        position: { x: -0.5, y: 0.0, z: 1.0 },
    };

    return tileLayer;
}

/**
 * Creates a 3d-tiles layer to display a tileset.
 *
 * @function
 * @param {string} id - identifer (must be unique amongst all layers id)
 * @param {Object} options
 * @param {URL} options.url - url to the tileset
 * @param {number} [options.sseThreshold = 16] - refinement threshold
 * @param {number} [options.cleanupDelay = 1000] - delay (in ms) after which unused
 * tiles are removed.
 *
 * @return {GeometryLayer}
 */
export function create3dTiles(id, options) {
    if (options.url) {
        options.url = new URL(options.url, document.location);
    }
    if (!options.url) {
        throw new Error('options.url must point to the tileset to be used');
    }
    const layer = new GeometryLayer(id, options.object3d || new THREE.Group());
    layer.preUpdate = pre3dTilesUpdate;
    layer.update = process3dTilesNode(
        $3dTilesCulling,
        $3dTilesSubdivisionControl);

    layer.url = options.url.href;
    layer.protocol = '3d-tiles';
    layer.overrideMaterials = options.overrideMaterials === undefined ? true : options.overrideMaterials;
    layer.type = 'geometry';
    layer.visible = true;
    layer.sseThreshold = options.sseThreshold || 16;
    layer.cleanupDelay = options.cleanupDelay || 1000;

    return layer;
}

/**
 * Creates a geometry layer to display a pointcloud.
 * The pointcloud data must have been prepared using PotreeConverter.
 *
 * @function
 * @param {string} id - identifer (must be unique amongst all layers id)
 * @param {Object} options
 * @param {string} options.url URL to the folder containing options.file
 * @param {string} [options.file = cloud.js] the file containging the metadata
 * @param {Object} [options.fetchOptions] see {@link Fetcher}
 *
 * @return {GeometryLayer}
 */
export function createPointcloud(id, options) {
    if (options.url) {
        options.url = new URL(options.url, document.location);
    }
    if (!options.url) {
        throw new Error('options.url must point to the tileset to be used');
    }

    const layer = new GeometryLayer(id, options.object3d || new THREE.Group());
    layer.file = options.file;
    layer.protocol = 'potreeconverter';
    layer.url = options.url.href;
    layer.table = options.lopocsTable;

    return layer;
}
