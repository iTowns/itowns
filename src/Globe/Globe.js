/**
 * Generated On: 2015-10-5
 * Class: Globe
 * Description: Le globe est le noeud du globe (node) principale.
 */

import Layer from 'Scene/Layer';
import Quadtree from 'Scene/Quadtree';
import SchemeTile from 'Scene/SchemeTile';
import MathExt from 'Core/Math/MathExtented';
import TileMesh from 'Globe/TileMesh';
import Atmosphere from 'Globe/Atmosphere';
import Clouds from 'Globe/Clouds';
import Capabilities from 'Core/System/Capabilities';
import GeoCoordinate, { UNIT } from 'Core/Geographic/GeoCoordinate';
import BasicMaterial from 'Renderer/BasicMaterial';
import LayersConfiguration from 'Scene/LayersConfiguration';
import * as THREE from 'three';
import { SSE_SUBDIVISION_THRESHOLD } from 'Scene/NodeProcess';
import FeatureToolBox from 'Renderer/ThreeExtented/FeatureToolBox';

/* eslint-disable */
// bbox longitude(0,360),latitude(-90,90)
const schemeTile_0 = 0;
// bbox longitude(-180,180),latitude(-90,90)
const schemeTile_1 = 1;
/* eslint-enable */

function Globe(ellipsoid, gLDebug) {
    // Constructor

    Layer.call(this);

    var caps = new Capabilities();
    this.NOIE = !caps.isInternetExplorer();
    this.gLDebug = gLDebug;
    this.ellipsoid = ellipsoid;

    // this.features = new Layer(); //new THREE.Group();
    // this.features.setName("featureLayerCollection");
    this.layerWGS84Zup = new Layer();

    this.gpxTracks = new Layer();
    var gpx = new THREE.Object3D();
    this.gpxTracks.add(gpx);
    this.gpxTracks.visible = true;
    gpx.visible = true;

    this.tiles = new Quadtree(TileMesh, this.SchemeTileWMTS(schemeTile_1), null);// featureLayerCollection
    this.layersConfiguration = new LayersConfiguration();

    this.atmosphere = this.NOIE ? new Atmosphere(this.ellipsoid) : undefined;
    this.clouds = new Clouds();

    var material = new BasicMaterial(new THREE.Color(1, 0, 0));

    var geometry = new THREE.SphereGeometry(5);
    var batiment = new THREE.Mesh(geometry, material);

    var position = this.ellipsoid.cartographicToCartesian(new GeoCoordinate(0, 48.87, 200, UNIT.DEGREE));

    position = new THREE.Vector3(4201215.424138484, 171429.945145441, 4779294.873914789);

    // http://www.apsalin.com/convert-geodetic-to-cartesian.aspx
    // 48.846931,2.337219,50
    position = new THREE.Vector3(4201801.65418896, 171495.727885073, 4779411.45896233);

    batiment.frustumCulled = false;
    // material.wireframe      = true;
    batiment.position.copy(position);

    var material2 = new BasicMaterial(new THREE.Color(1, 0.5, 1));
    material2.visible = false;
    var batiment2 = new THREE.Mesh(geometry, material2);
    var position2 = this.ellipsoid.cartographicToCartesian(new GeoCoordinate(0.001, 48.87, 100, UNIT.DEGREE));
    batiment2.frustumCulled = false;
    material2.wireframe = true;
    batiment2.position.copy(position2);

    // kml.add( batiment );
    // kml.add( batiment2 );

    var zUp = new THREE.Object3D();

    zUp.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
    zUp.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI));

    this.layerWGS84Zup.add(zUp);
    zUp.add(new THREE.AxisHelper(10000000));
    zUp.add(batiment);

    this.add(this.tiles);
    // this.add(this.features);
    this.add(this.gpxTracks);
    // this.add(this.layerWGS84Zup);

    if (this.atmosphere !== undefined && !this.gLDebug) {
        this.atmosphere.add(this.clouds);
        this.add(this.atmosphere);
    }
}

Globe.prototype = Object.create(Layer.prototype);

Globe.prototype.constructor = Globe;

/**
 * @documentation: Rafrachi les materiaux en fonction du quadTree ORTHO
 *
 */
Globe.prototype.QuadTreeToMaterial = function () {
    // TODO: Implement Me

};

Globe.prototype.SchemeTileWMTS = function (type) {
    if (type === 0) {
        // bbox longitude(0,360),latitude(-90,90)
        const schemeT = new SchemeTile();

        schemeT.add(0, MathExt.PI, -MathExt.PI_OV_TWO, MathExt.PI_OV_TWO);
        schemeT.add(MathExt.PI, MathExt.TWO_PI, -MathExt.PI_OV_TWO, MathExt.PI_OV_TWO);

        return schemeT;
    }
    else if (type === 1) {
        // bbox longitude(-180,180),latitude(-90,90)
        const schemeT = new SchemeTile();

        schemeT.add(-MathExt.PI, 0, -MathExt.PI_OV_TWO, MathExt.PI_OV_TWO);
        schemeT.add(0, MathExt.PI, -MathExt.PI_OV_TWO, MathExt.PI_OV_TWO);

        return schemeT;
    }
};

Globe.prototype.showAtmosphere = function (show) {
    if (this.atmosphere !== undefined)
      { this.atmosphere.visible = show; }
};

Globe.prototype.showClouds = function (show, satelliteAnimation) {
    if (/* this.clouds.live === false && */ show) {
        this.clouds.generate(satelliteAnimation);
    }
    this.clouds.visible = show;
};

Globe.prototype.showFeature = function (show) {
    this.features.visible = show;

    this.features.children[0].visible = show;
};

Globe.prototype.updateLightingPos = function (pos) {
    this.atmosphere.updateLightingPos(pos);
    this.clouds.updateLightingPos(pos);
};

Globe.prototype.setLayerOpacity = function (id, opacity) {
    this.layersConfiguration.setLayerOpacity(id, opacity);

    var cO = function (object) {
        if (object.material.setLayerOpacity) {
            object.material.setLayerOpacity(object.getIndexLayerColor(id), opacity);
        }
    };

    // children[0] is rootNode
    this.tiles.children[0].traverse(cO);
};

Globe.prototype.setLayerVisibility = function (id, visible) {
    this.layersConfiguration.setLayerVisibility(id, visible);

    var cO = function (object) {
        if (object.material.setLayerVisibility) {
            object.material.setLayerVisibility(object.getIndexLayerColor(id), visible);
        }
    };

    // children[0] is rootNode
    this.tiles.children[0].traverse(cO);

    var featureLayer = this.getFeatureLayerByName(id);
    if (featureLayer != undefined)
        { featureLayer.children[0].visible = visible; }
};

Globe.prototype.updateLayersOrdering = function () {
    var sequence = this.layersConfiguration.getColorLayersIdOrderedBySequence();

    var cO = function (object) {
        if (object.changeSequenceLayers)
            { object.changeSequenceLayers(sequence); }
    };

    this.tiles.children[0].traverse(cO);
};

Globe.prototype.removeColorLayer = function (layer) {
    var cO = function (object) {
        if (object.removeColorLayer) {
            object.removeColorLayer(layer);
        }
    };

    this.tiles.children[0].traverse(cO);
};

Globe.prototype.getZoomLevel = function () {
    var cO = (function () {
        var zoom = 0;
        return function (object) {
            if (object) {
                zoom = Math.max(zoom, object.level);
            }
            return zoom;
        };
    }());

    this.tiles.children[0].traverseVisible(cO);
    return cO();
};


Globe.prototype.computeDistanceForZoomLevel = function (zoom, camera) {
    return camera.preSSE * Math.pow(this.tiles.minLevel, (this.tiles.maxLevel - zoom + 1)) / SSE_SUBDIVISION_THRESHOLD;
};

Globe.prototype.getTile = function (coordinate) {
    return this.tiles.getTile(coordinate);
};

Globe.prototype.setRealisticLightingOn = function (bool) {
    this.atmosphere.setRealisticOn(bool);
    this.clouds.setLightingOn(bool);
};

Globe.prototype.getFeatureLayerByName = function (name) {
    var layers = this.children;
    for (var i = 0; i < layers.length; i++) {
        if (layers[i] instanceof Layer && layers[i].getName() === name)
            { return layers[i]; }
    }
    return undefined;
};

Globe.prototype.createFeatureLayer = function (name) {
    var featureLayer = new Layer();
    featureLayer.setName(name);
    var dataLayer = new THREE.Object3D();
    dataLayer.frustumCulled = false;
    dataLayer.name = name;
    featureLayer.add(dataLayer);
    this.add(featureLayer);
    return featureLayer;
};

var tool = new FeatureToolBox();
Globe.prototype.addFeature = function (options) {
    var layerId = options.layerId;
    var layer = this.getFeatureLayerByName(layerId);
    if ((layerId != undefined) && (options.geometry != undefined) && (layer != undefined)) {
        var object = tool.processingGeoJSON(options.geometry);
        layer.children[0].add(object);
    }
};

export default Globe;
