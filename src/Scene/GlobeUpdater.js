/**
 * Generated On: 2016-11-15
 * Class: GlobeUpdater
 * Description: Updaters for Globes.
 */

import NodeProcess from 'Scene/NodeProcess';
import Quadtree from 'Scene/Quadtree';
import TreeUpdater from 'Scene/TreeUpdater';
import Layer from 'Scene/Layer';
import DefaultUpdater from 'Scene/DefaultUpdater';
import MobileMappingLayer from 'MobileMapping/MobileMappingLayer';
import MobileMappingUpdater from 'Scene/MobileMappingUpdater';


function GlobeUpdater(ellipsoid) {
    this.treeUpdater = new TreeUpdater(new NodeProcess(ellipsoid));
    this.defaultUpdater = new DefaultUpdater();
    this.mobileMappingUpdater = new MobileMappingUpdater();

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

GlobeUpdater.prototype.update = function (params) {
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

GlobeUpdater.prototype.updateMaterial = function (params) {
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

GlobeUpdater.prototype.selectNode = function (params) {
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

export default GlobeUpdater;
