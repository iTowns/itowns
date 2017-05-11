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

function TileProvider() {
    Provider.call(this, null);
}

TileProvider.prototype = Object.create(Provider.prototype);

TileProvider.prototype.constructor = TileProvider;

TileProvider.prototype.executeCommand = function executeCommand(command) {
    var extent = command.extent;

    var parent = command.requester;

    // build tile
    var params = {
        extent,
        level: (command.level === undefined) ? (parent.level + 1) : command.level,
        segment: 16,
    };
    if (command.layer.materialOptions) {
        params.materialOptions = command.layer.materialOptions;
    }

    const geometry = new TileGeometry(params, command.layer.builder);

    var tile = new TileMesh(geometry, params);

    tile.layer = command.layer.id;
    tile.layers.set(command.threejsLayer);
    tile.setUuid();
    tile.geometricError = Math.pow(2, (18 - params.level));

    if (parent) {
        parent.worldToLocal(params.center);
    }

    tile.position.copy(params.center);
    tile.setVisibility(false);
    tile.updateMatrix();
    if (parent) {
        tile.setBBoxZ(parent.OBB().z.min, parent.OBB().z.max);
    }

    return Promise.resolve(tile);
};

export default TileProvider;
