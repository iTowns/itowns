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
import Projection from '../../Geographic/Projection';
import BuilderEllipsoidTile from '../../../Globe/BuilderEllipsoidTile';
import TileGeometry from '../../../Globe/TileGeometry';

function TileProvider() {
    Provider.call(this, null);

    this.projection = new Projection();
    this.builder = new BuilderEllipsoidTile(this.projection);

    this.nNode = 0;
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

    const geometry = new TileGeometry(params, this.builder);

    var tile = new command.type(geometry, params);

    tile.setUuid(this.nNode++);
    tile.link = parent.link;
    tile.geometricError = Math.pow(2, (18 - params.level));

    parent.worldToLocal(params.center);

    tile.position.copy(params.center);
    tile.setVisibility(false);

    parent.add(tile);
    tile.updateMatrix();
    tile.updateMatrixWorld();
    tile.OBB().parent = tile;   // TODO: we should use tile.add(tile.OBB())
    tile.OBB().update();

    return Promise.resolve(tile);
};

export default TileProvider;
