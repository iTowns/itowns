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

import Provider from 'Core/Commander/Providers/Provider';

function TileProvider() {
    Provider.call(this, null);
}

TileProvider.prototype = Object.create(Provider.prototype);

TileProvider.prototype.constructor = TileProvider;

TileProvider.prototype.preprocessLayer = function preprocessLayer(/* layer*/) {
    /* no-op */
};

TileProvider.prototype.executeCommand = function executeCommand(command) {
    var bbox = command.bbox;

    var parent = command.requester;

    // build tile
    var params = {
        bbox,
        level: (command.level === undefined) ? (parent.level + 1) : command.level,
        segment: 16,
    };

    var tile = new command.type(params, command.layer.builder);

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

    // TODO: copy textures from parent
    // maybe add a compute_sub_uv command type?

    return Promise.resolve(tile);
};

export default TileProvider;
