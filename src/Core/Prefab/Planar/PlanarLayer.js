import * as THREE from 'three';

import GeometryLayer from '../../Layer/GeometryLayer';

import { processTiledGeometryNode } from '../../../Process/TiledNodeProcessing';
import { planarCulling, planarSubdivisionControl, prePlanarUpdate } from '../../../Process/PlanarTileProcessing';
import PlanarTileBuilder from './PlanarTileBuilder';
import SubdivisionControl from '../../../Process/SubdivisionControl';
import Picking from '../../Picking';

/**
 * A geometry layer to be used only with a {@link PlanarView}.
 *
 * @constructor
 *
 * @param {string} id
 * @param {Extent} extent - the extent to define the layer within
 * @param {Object} options
 * @param {THREE.Object3D} options.object3d
 * @param {number} [options.maxSubdivisionLevel=5]
 * @param {number} [options.maxDeltaElevationLevel=4]
 */
function PlanarLayer(id, extent, options) {
    GeometryLayer.call(this, id, options.object3d || new THREE.Group());

    this.extent = extent;
    this.schemeTile = [extent];

    function subdivision(context, layer, node) {
        if (SubdivisionControl.hasEnoughTexturesToSubdivide(context, layer, node)) {
            return planarSubdivisionControl(
                options.maxSubdivisionLevel || 5,
                options.maxDeltaElevationLevel || 4)(context, layer, node);
        }
        return false;
    }

    this.update = processTiledGeometryNode(planarCulling, subdivision);
    this.builder = new PlanarTileBuilder();
    // provide custom pick function
    this.pickObjectsAt = (_view, mouse, radius) => Picking.pickTilesAt(_view, mouse, radius, this);
}

PlanarLayer.prototype = Object.create(GeometryLayer.prototype);
PlanarLayer.prototype.constructor = PlanarLayer;

PlanarLayer.prototype.preUpdate = function preUpdate(context, changeSources) {
    SubdivisionControl.preUpdate(context, this);

    prePlanarUpdate(context, this);

    if (__DEBUG__) {
        this._latestUpdateStartingLevel = 0;
    }

    if (changeSources.has(undefined) || changeSources.size == 0) {
        return this.level0Nodes;
    }

    return GeometryLayer.prototype.preUpdate.call(this, context, changeSources);
};

export default PlanarLayer;
