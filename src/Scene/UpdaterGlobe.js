/**
 * Generated On: 2016-11-15
 * Class: UpdaterGlobe
 * Description: Updaters for Globes.
 */

import NodeProcess from 'Scene/NodeProcess';
import Quadtree from 'Scene/Quadtree';
import UpdaterQuadtree from 'Scene/UpdaterQuadtree';
import Layer from 'Scene/Layer';
import UpdaterLayer from 'Scene/UpdaterLayer';
import MobileMappingLayer from 'MobileMapping/MobileMappingLayer';
import UpdaterMobileMappingLayer from 'Scene/UpdaterMobileMappingLayer';


function UpdaterGlobe(ellipsoid) {
    this.treeUpdater = new UpdaterQuadtree(new NodeProcess(ellipsoid));
    this.defaultUpdater = new UpdaterLayer();
    this.mobileMappingUpdater = new UpdaterMobileMappingLayer();

    this.getUpdater = function (subLayer) {
        if (subLayer instanceof Quadtree) {
            return this.treeUpdater;
        }
        else if (subLayer instanceof Layer) {
            return this.defaultUpdater;
        }
        else if (subLayer instanceof MobileMappingLayer) {
            return this.mobileMappingUpdater;
        }
    };
}

UpdaterGlobe.prototype.update = function (params) {
    var layer = params.layer;
    for (var l = 0; l < layer.children.length; l++) {
        var sLayer = layer.children[l];
        var updater = this.getUpdater(sLayer);
        if (updater && updater.update) {
            params.layer = sLayer;
            updater.update(params);
        }
    }
    params.layer = layer;
};

UpdaterGlobe.prototype.updateMaterial = function (params) {
    var layer = params.layer;
    for (var l = 0; l < layer.children.length; l++) {
        var sLayer = layer.children[l];
        var updater = this.getUpdater(sLayer);
        if (updater && updater.updateMaterial) {
            params.layer = sLayer;
            updater.updateMaterial(params);
        }
    }
};

UpdaterGlobe.prototype.selectNode = function (params) {
    var layer = params.layer;
    for (var l = 0; l < layer.children.length; l++) {
        var sLayer = layer.children[l];
        var updater = this.getUpdater(sLayer);
        if (updater && updater.selectNode) {
            params.layer = sLayer;
            updater.selectNode(params);
        }
    }
};

export default UpdaterGlobe;
