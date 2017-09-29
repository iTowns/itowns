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
import { CancelledCommandException } from '../Scheduler';
import { requestNewTile } from '../../../Process/TiledNodeProcessing';

function TileProvider() {
    Provider.call(this, null);
}

TileProvider.prototype = Object.create(Provider.prototype);

TileProvider.prototype.constructor = TileProvider;

TileProvider.prototype.preprocessDataLayer = function preprocessLayer(layer, view, scheduler) {
    if (!layer.schemeTile) {
        throw new Error(`Cannot init tiled layer without schemeTile for layer ${layer.id}`);
    }

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
        extent,
        level: (command.level === undefined) ? (parent.level + 1) : command.level,
        segment: 16,
        materialOptions: command.layer.materialOptions,
        disableSkirt: command.layer.disableSkirt,
        crs: command.view.referenceCrs,
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
