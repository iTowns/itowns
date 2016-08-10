/**
 * Generated On: 2015-10-5
 * Class: Plane
 * Description: Le Plane est le noeud du Plane (node) principale.
 */


import Layer from 'Scene/Layer';
import Quadtree from 'Scene/Quadtree';
import SchemeTile from 'Scene/SchemeTile';
import TileMesh from 'Globe/TileMesh';
import LayersConfiguration from 'Scene/LayersConfiguration';
import PointCloud from 'Scene/PointCloud'

function Plane(parameters, gLDebug) {
    //Constructor

    Layer.call(this);

    this.gLDebug = gLDebug;
    this.pointcloud = new PointCloud(parameters.bbox);

    this.batiments = new Layer();
    this.layerWGS84Zup = new Layer();

    this.tiles = new Quadtree(TileMesh, this.SchemeTileWMTS(1, parameters.bbox));
    this.layersConfiguration = new LayersConfiguration();

    this.add(this.tiles);
    this.add(this.pointcloud);
}

Plane.prototype = Object.create(Layer.prototype);

Plane.prototype.constructor = Plane;

Plane.prototype.SchemeTileWMTS = function(type, bbox) {
    //TODO: Implement Me
    if (type === 1) {
        var schemeT = new SchemeTile();
        schemeT.add(bbox.minCarto.longitude, bbox.maxCarto.longitude, bbox.minCarto.latitude, bbox.maxCarto.latitude);
        return schemeT;
    }

};

Plane.prototype.setLayerOpacity = function(id, opacity){
    this.layersConfiguration.setLayerOpacity(id, opacity);

    var cO = function(object){
        if(object.material.setLayerOpacity) {
            object.material.setLayerOpacity(object.getIndexLayerColor(id),opacity);
        }
    };

    // children[0] is rootNode
    this.tiles.children[0].traverse(cO);
};

Plane.prototype.setLayerVisibility = function(id, visible){
    this.layersConfiguration.setLayerVisibility(id, visible);

    var cO = function(object){
        if(object.material.setLayerOpacity) {
            object.material.setLayerVisibility(object.getIndexLayerColor(id), visible);
        }
    };

    // children[0] is rootNode
    this.tiles.children[0].traverse(cO);
};

Plane.prototype.updateLayersOrdering = function(){
    var sequence = this.layersConfiguration.getColorLayersIdOrderedBySequence();

    var cO = function(object){
        if(object.changeSequenceLayers)
            object.changeSequenceLayers(sequence);
    }.bind(this);

    this.tiles.children[0].traverse(cO);
};

Plane.prototype.getZoomLevel = function(/*id*/){
    var cO = function(/*object*/){

        var zoom = 0;
        return function (object){
            if(object){
                zoom = Math.max(zoom,object.level);
            }
                return zoom;
        };

    }();
    this.tiles.children[0].traverseVisible(cO);
    return cO();
};

Plane.prototype.setRealisticLightingOn = function(bool) {

    this.atmosphere.setRealisticOn(bool);
    this.clouds.setLightingOn(bool);
};

export default Plane;
