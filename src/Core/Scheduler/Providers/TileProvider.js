/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/*
 * A Faire
 * Les tuiles de longitude identique ont le maillage et ne demande pas 1 seule calcul pour la génération du maillage
 *
 *
 *
 *
 */

import Provider from './Provider';
import TileGeometry from '../../TileGeometry';
import TileMesh from '../../TileMesh';
import CancelledCommandException from '../CancelledCommandException';
import { requestNewTile } from '../../../Process/TiledNodeProcessing';
import ObjectRemovalHelper from '../../../Process/ObjectRemovalHelper';
import { updateLayeredMaterialNodeImagery, updateLayeredMaterialNodeElevation } from '../../../Process/LayeredMaterialNodeProcessing';

function TileProvider() {
    Provider.call(this, null);
}

TileProvider.prototype = Object.create(Provider.prototype);

TileProvider.prototype.constructor = TileProvider;

TileProvider.prototype.preprocessDataLayer = function preprocessLayer(layer, view, scheduler) {
    if (!layer.schemeTile) {
        throw new Error(`Cannot init tiled layer without schemeTile for layer ${layer.id}`);
    }

    layer.addColorLayer = (colorLayer) => {
        if (colorLayer.protocol === 'rasterizer') {
            colorLayer.reprojection = 'EPSG:4326';
        }
        if (!colorLayer.update) {
            const colorLayerCount = view.getLayers(l => l.type === 'color').length;
            colorLayer.sequence = colorLayerCount;
            colorLayer.update = updateLayeredMaterialNodeImagery;
        }

        return view.addLayer(colorLayer, layer);
    };
    layer.removeColorLayer = (colorLayerOrId) => {
        const layerId = colorLayerOrId.id === undefined ? colorLayerOrId : colorLayerOrId.id;
        const colorLayer = view.getLayers(l => l.id === layerId)[0];
        if (colorLayer && colorLayer.type === 'color' && layer.detach(colorLayer)) {
            // remove layer from all tiles
            for (const root of layer.level0Nodes) {
                root.traverse((tile) => {
                    if (tile.removeColorLayer) {
                        tile.removeColorLayer(layerId);
                    }
                });
            }
            // update color sequence of other color layers
            const imageryLayers = view.getLayers((l, p) => (p.id == layer.id && l.type === 'color'));
            for (const color of imageryLayers) {
                if (color.sequence > colorLayer.sequence) {
                    color.sequence--;
                }
            }
            return true;
        } else {
            // eslint-disable-next-line no-console
            console.error(`${colorLayerOrId} isn't a color layer`);
            return false;
        }
    };

    layer.addElevationLayer = (elevationLayer) => {
        if (elevationLayer.protocol === 'wmts' && elevationLayer.options.tileMatrixSet !== 'WGS84G') {
            throw new Error('Only WGS84G tileMatrixSet is currently supported for WMTS elevation layers');
        }

        elevationLayer.update = elevationLayer.update || updateLayeredMaterialNodeElevation;

        return view.addLayer(elevationLayer, layer);
    };
    layer.removeElevationLayer = (elevationLayerOrId) => {
        const layerId = elevationLayerOrId.id === undefined ? elevationLayerOrId : elevationLayerOrId.id;
        const elevationLayer = view.getLayers(l => l.id === layerId)[0];
        if (elevationLayer && elevationLayer.type === 'elevation' && layer.detach(elevationLayer)) {
            // TODO: cleanup elevation textures
            return true;
        } else {
            // eslint-disable-next-line no-console
            console.error(`${elevationLayerOrId} isn't an elevation layer`);
            return false;
        }
    };

    layer.addFeatureLayer = featureLayer => view.addLayer(featureLayer, layer);
    layer.removeFeatureLayer = (featureLayerOrId) => {
        const layerId = featureLayerOrId.id === undefined ? featureLayerOrId : featureLayerOrId.id;
        const featureLayer = view.getLayers(l => l.id === layerId)[0];
        if (featureLayer && layer.detach(featureLayer)) {
            const fn = (tile) => { ObjectRemovalHelper.removeChildrenAndCleanupRecursively(layerId, tile); };
            for (const root of layer.level0Nodes) {
                root.traverse(fn);
            }
            return true;
        } else {
            // eslint-disable-next-line no-console
            console.error(`${featureLayerOrId} isn't a feature layer`);
            return false;
        }
    };

    layer.removeLayer = (layerOrId) => {
        const layerId = layerOrId.id === undefined ? layerOrId : layerOrId.id;
        const toRemove = view.getLayers(l => l.id === layerId)[0];
        if (layer.type === 'color') {
            return layer.removeColorLayer(toRemove);
        } else if (layer.type === 'elevation') {
            return layer.removeElevationLayer(toRemove);
        } else {
            return layer.removeFeatureLayer(toRemove);
        }
    };

    layer.level0Nodes = [];
    layer.onTileCreated = layer.onTileCreated || (() => {});

    const promises = [];

    for (const root of layer.schemeTile) {
        promises.push(requestNewTile(view, scheduler, layer, root, undefined, 0));
    }
    return Promise.all(promises).then((level0s) => {
        layer.level0Nodes = level0s;
        for (const level0 of level0s) {
            layer.object3d.add(level0);
            level0.updateMatrixWorld();
        }
    });
};

TileProvider.prototype.executeCommand = function executeCommand(command) {
    var extent = command.extent;
    if (command.requester &&
        !command.requester.material) {
        // request has been deleted
        return Promise.reject(new CancelledCommandException(command));
    }

    var parent = command.requester;


    // build tile
    var params = {
        layerId: command.layer.id,
        extent,
        level: (command.level === undefined) ? (parent.level + 1) : command.level,
        segment: 16,
        materialOptions: command.layer.materialOptions,
        disableSkirt: command.layer.disableSkirt,
    };

    const geometry = new TileGeometry(params, command.layer.builder);

    var tile = new TileMesh(geometry, params);

    tile.layer = command.layer.id;
    tile.layers.set(command.threejsLayer);

    if (parent) {
        params.center.sub(parent.geometry.center);
    }

    tile.position.copy(params.center);
    tile.material.transparent = command.layer.opacity < 1.0;
    tile.material.uniforms.opacity.value = command.layer.opacity;
    tile.setVisibility(false);
    tile.updateMatrix();
    if (parent) {
        tile.setBBoxZ(parent.OBB().z.min, parent.OBB().z.max);
    } else if (command.layer.materialOptions && command.layer.materialOptions.useColorTextureElevation) {
        tile.setBBoxZ(command.layer.materialOptions.colorTextureElevationMinZ, command.layer.materialOptions.colorTextureElevationMaxZ);
    }

    return Promise.resolve(tile);
};

export default TileProvider;
