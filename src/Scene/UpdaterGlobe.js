/**
 * Generated On: 2016-11-15
 * Class: UpdaterGlobe
 * Description: Updaters for Globes.
 */

import Quadtree from 'Scene/Quadtree';
import UpdaterQuadtree from 'Scene/UpdaterQuadtree';
import Layer from 'Scene/Layer';
import UpdaterLayer from 'Scene/UpdaterLayer';
import MobileMappingLayer from 'MobileMapping/MobileMappingLayer';
import UpdaterMobileMappingLayer from 'Scene/UpdaterMobileMappingLayer';


function UpdaterGlobe(args) {
    this.node = args.node;
    for (var i = 0; i < this.node.children.length; i++) {
        var child = this.node.children[i];
        if (child instanceof Quadtree)
            { child.updater = new UpdaterQuadtree(args); }
        else if (child instanceof Layer)
            { child.updater = new UpdaterLayer(args); }
        else if (child instanceof MobileMappingLayer)
            { child.updater = new UpdaterMobileMappingLayer(args); }
    }
}

UpdaterGlobe.prototype.update = function (params) {
    var layer = params.layer;
    for (var l = 0; l < layer.children.length; l++) {
        var sLayer = layer.children[l];
        // Is implemented for Quadtree, Layer and MobileMappingLayer
        if (sLayer.updater && sLayer.updater.update) {
            params.layer = sLayer;
            sLayer.updater.update(params);
        }
    }
    params.layer = layer;
};

UpdaterGlobe.prototype.updateMaterial = function (params) {
    for (var l = 0; l < params.layer.children.length; l++) {
        var sLayer = params.layer.children[l];
        if (sLayer.updater && sLayer.updater.updateMaterial)
            { sLayer.updater.updateMaterial(params); }
    }
};

UpdaterGlobe.prototype.setNodeToSelect = function (params) {
    for (var l = 0; l < params.layer.children.length; l++) {
        var sLayer = params.layer.children[l];
        if (sLayer.updater && sLayer.updater.updateMaterial)
            { sLayer.updater.setNodeToSelect(params); }
    }
};

export default UpdaterGlobe;
