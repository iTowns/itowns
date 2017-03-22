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
// import { Quaternion, Vector3 } from 'three';
import Provider from './Provider';
import Projection from '../../Geographic/Projection';
import BuilderEllipsoidTile from '../../../Globe/BuilderEllipsoidTile';
import TileGeometry from '../../../Globe/TileGeometry';
import OGCWebServiceHelper, { SIZE_TEXTURE_TILE } from './OGCWebServiceHelper';
import { EMPTY_TEXTURE_ZOOM, l_ELEVATION } from '../../../Renderer/LayeredMaterial';

function TileProvider() {
    Provider.call(this, null);

    this.projection = new Projection();
    this.builder = new BuilderEllipsoidTile(this.projection);

    this.nNode = 0;
}

TileProvider.prototype = Object.create(Provider.prototype);

TileProvider.prototype.constructor = TileProvider;

TileProvider.prototype.executeCommand = function executeCommand(command) {
    var bbox = command.bbox;

    var parent = command.requester;

    // build tile
    var params = {
        bbox,
        level: (command.level === undefined) ? (parent.level + 1) : command.level,
        segment: 16,
        parentMaterial: parent.material,
        parentWmtsCoords: parent.wmtsCoords,
        transformation: undefined,
    };

    const geometry = new TileGeometry(params, this.builder);

    var tile = new command.type(geometry, params);

    tile.setUuid(this.nNode++);
    tile.link = parent.link;
    tile.geometricError = Math.pow(2, (18 - params.level));
    tile.center = params.center.clone();


    tile.position.copy(params.center);
    tile.matrixAutoUpdate = false;
    tile.matrixWorldNeedsUpdate = false;
    tile.quaternion.copy(params.transformation.quaternion);
    tile.setVisibility(false);
    tile.updateMatrix();

    // ATTENTION La world matrix est calculer une fois pour toute ici -->
    tile.updateMatrixWorld(true);
    parent.add(tile);


    // tile.OBB().parent = tile;   // TODO: we should use tile.add(tile.OBB())
    tile.OBB().update();

    // update bbox if node herits texture elevation from parent
    if (tile.material.getElevationLayerLevel() > EMPTY_TEXTURE_ZOOM) {
        const textureElevation = tile.material.getLayerTextures(l_ELEVATION)[0];
        const { min, max } = OGCWebServiceHelper.ioDXBIL.computeMinMaxElevation(
                textureElevation.image.data,
                SIZE_TEXTURE_TILE, SIZE_TEXTURE_TILE,
                tile.material.offsetScale[0][0]);

        if (min && max) {
            tile.setBBoxZ(min, max);
        }
    }

    return Promise.resolve(tile);
};

export default TileProvider;
