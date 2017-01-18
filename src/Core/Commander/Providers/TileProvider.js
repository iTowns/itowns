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
import Projection from 'Core/Geographic/Projection';
import BuilderEllipsoidTile from 'Globe/BuilderEllipsoidTile';

function TileProvider(ellipsoid) {
    Provider.call(this, null);

    this.projection = new Projection();
    this.builder = new BuilderEllipsoidTile(ellipsoid, this.projection);

    this.nNode = 0;
}

TileProvider.prototype = Object.create(Provider.prototype);

TileProvider.prototype.constructor = TileProvider;

TileProvider.prototype.preprocessLayer = function preprocessLayer(/* layer*/) {
    /* no-op */
};

TileProvider.prototype.executeCommand = function executeCommand(command) {
    var bbox = command.paramsFunction.bbox;

    var parent = command.requester;

    // build tile
    var params = {
        bbox,
        level: (command.level === undefined) ? (parent.level + 1) : command.level,
        segment: 16,
    };

    var tile = new command.type(params, this.builder);

    tile.setUuid(this.nNode++);
    tile.link = parent.link;
    tile.geometricError = Math.pow(2, (18 - params.level));

    parent.worldToLocal(params.center);

    tile.position.copy(params.center);
    tile.setVisibility(false);

    parent.add(tile);
    tile.updateMatrix();
    tile.updateMatrixWorld();

    return Promise.resolve(tile);
};

export default TileProvider;
