import * as THREE from 'three';

import GeometryLayer from '../../Layer/GeometryLayer';

import { processTiledGeometryNode } from '../../../Process/TiledNodeProcessing';
import { globeCulling, preGlobeUpdate, globeSubdivisionControl, globeSchemeTileWMTS, globeSchemeTile1 } from '../../../Process/GlobeTileProcessing';
import BuilderEllipsoidTile from './BuilderEllipsoidTile';
import SubdivisionControl from '../../../Process/SubdivisionControl';
import Picking from '../../Picking';

/**
 * A geometry layer to be used only with a {@link GlobeView}.
 *
 * @constructor
 *
 * @param {string} id
 * @param {Object} options
 * @param {THREE.Object3D} options.object3d
 * @param {number} [options.maxSubdivisionLevel=18]
 * @param {number} [options.sseSubdivisionThreshold=1]
 * @param {number} [options.maxDeltaElevationLevel=4]
 */
function GlobeLayer(id, options) {
    GeometryLayer.call(this, id, options.object3d || new THREE.Group());

    // Configure tiles
    this.schemeTile = globeSchemeTileWMTS(globeSchemeTile1);
    this.extent = this.schemeTile[0].clone();
    for (let i = 1; i < this.schemeTile.length; i++) {
        this.extent.union(this.schemeTile[i]);
    }
    function subdivision(context, layer, node) {
        if (SubdivisionControl.hasEnoughTexturesToSubdivide(context, layer, node)) {
            return globeSubdivisionControl(2,
                options.maxSubdivisionLevel || 18,
                options.sseSubdivisionThreshold || 1.0,
                options.maxDeltaElevationLevel || 4)(context, layer, node);
        }
        return false;
    }

    this.update = processTiledGeometryNode(globeCulling(2), subdivision);
    this.builder = new BuilderEllipsoidTile();
    // provide custom pick function
    this.pickObjectsAt = (_view, mouse, radius = 5) => Picking.pickTilesAt(_view, mouse, radius, this);
}

GlobeLayer.prototype = Object.create(GeometryLayer.prototype);
GlobeLayer.prototype.constructor = GlobeLayer;

GlobeLayer.prototype.preUpdate = function preUpdate(context, layer, changeSources) {
    SubdivisionControl.preUpdate(context, layer);

    if (__DEBUG__) {
        layer._latestUpdateStartingLevel = 0;
    }

    preGlobeUpdate(context, layer);

    return GeometryLayer.prototype.preUpdate.call(this, context, layer, changeSources);
};

export default GlobeLayer;
