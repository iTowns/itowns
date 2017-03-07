/**
 * Generated On: 2015-10-5
 * Class: Globe
 * Description: Le globe est le noeud du globe (node) principale.
 */

import * as THREE from 'three';
import Layer from '../Scene/Layer';
import Quadtree from '../Scene/Quadtree';
import SchemeTile from '../Scene/SchemeTile';
import MathExt from '../Core/Math/MathExtended';
import TileMesh from './TileMesh';
import Atmosphere from './Atmosphere';
import Clouds from './Clouds';
import Capabilities from '../Core/System/Capabilities';
import { UNIT } from '../Core/Geographic/Coordinates';
import LayersConfiguration from '../Scene/LayersConfiguration';
import { SSE_SUBDIVISION_THRESHOLD } from '../Scene/NodeProcess';
import BoundingBox from '../Scene/BoundingBox';

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

    this.gpxTracks = new Layer();
    var gpx = new THREE.Object3D();
    this.gpxTracks.add(gpx);
    this.gpxTracks.visible = true;
    gpx.visible = true;

    this.tiles = new Quadtree(TileMesh, this.SchemeTileWMTS(schemeTile_1), null);
    this.layersConfiguration = new LayersConfiguration();

    this.atmosphere = this.NOIE ? new Atmosphere(ellipsoid) : undefined;
    this.clouds = new Clouds();

    var zUp = new THREE.Object3D();
    zUp.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
    zUp.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI));
    this.layerWGS84Zup = new Layer();
    this.layerWGS84Zup.add(zUp);

    this.add(this.tiles);
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
Globe.prototype.QuadTreeToMaterial = function QuadTreeToMaterial() {
    // TODO: Implement Me

};

Globe.prototype.SchemeTileWMTS = function SchemeTileWMTS(type) {
    const schemeT = new SchemeTile();

    if (type === 0) {
        // bbox longitude(0,360),latitude(-90,90)
        schemeT.add(new BoundingBox('EPSG:4326', 0, MathExt.PI, -MathExt.PI_OV_TWO, MathExt.PI_OV_TWO));
        schemeT.add(new BoundingBox('EPSG:4326', MathExt.PI, MathExt.TWO_PI, -MathExt.PI_OV_TWO, MathExt.PI_OV_TWO));
    } else if (type == 1) {
        // bbox longitude(-180,180),latitude(-90,90)
        schemeT.add(new BoundingBox('EPSG:4326', -MathExt.PI, 0, -MathExt.PI_OV_TWO, MathExt.PI_OV_TWO));
        schemeT.add(new BoundingBox('EPSG:4326', 0, MathExt.PI, -MathExt.PI_OV_TWO, MathExt.PI_OV_TWO));
    }
    // store internally as Radians to avoid doing too much deg->rad conversions
    for (const bbox of schemeT.schemeBB) {
        bbox.minCoordinate._internalStorageUnit = UNIT.RADIAN;
        bbox.maxCoordinate._internalStorageUnit = UNIT.RADIAN;
    }
    return schemeT;
};

Globe.prototype.showAtmosphere = function showAtmosphere(show) {
    if (this.atmosphere !== undefined)
      { this.atmosphere.visible = show; }
};

Globe.prototype.showClouds = function showClouds(show, satelliteAnimation) {
    if (/* this.clouds.live === false && */ show) {
        this.clouds.generate(satelliteAnimation);
    }
    this.clouds.visible = show;
};

Globe.prototype.updateLightingPos = function updateLightingPos(pos) {
    this.atmosphere.updateLightingPos(pos);
    this.clouds.updateLightingPos(pos);
};

Globe.prototype.setLayerOpacity = function setLayerOpacity(id, opacity) {
    this.layersConfiguration.setLayerOpacity(id, opacity);

    var cO = function cO(object) {
        if (object.material.setLayerOpacity) {
            object.material.setLayerOpacity(object.getIndexLayerColor(id), opacity);
        }
    };

    // children[0] is rootNode
    this.tiles.children[0].traverse(cO);
};

Globe.prototype.setLayerVisibility = function setLayerVisibility(id, visible) {
    this.layersConfiguration.setLayerVisibility(id, visible);

    var featureLayer = this.layersConfiguration.getGeometryLayerById(id);
    if (featureLayer != undefined) {
        featureLayer.root.layer.visible = visible;
        featureLayer.root.visible = visible;
    } else {
        var cO = function cO(object) {
            if (object.material.setLayerVisibility) {
                object.material.setLayerVisibility(object.getIndexLayerColor(id), visible);
            }
        };

        // children[0] is rootNode
        this.tiles.children[0].traverse(cO);
    }
};

Globe.prototype.updateLayersOrdering = function updateLayersOrdering() {
    var sequence = this.layersConfiguration.getColorLayersIdOrderedBySequence();

    var cO = function cO(object) {
        if (object.changeSequenceLayers)
            { object.changeSequenceLayers(sequence); }
    };

    this.tiles.children[0].traverse(cO);
};

Globe.prototype.removeColorLayer = function removeColorLayer(layer) {
    var cO = function cO(object) {
        if (object.removeColorLayer) {
            object.removeColorLayer(layer);
        }
    };

    this.tiles.children[0].traverse(cO);
};

Globe.prototype.getZoomLevel = function getZoomLevel() {
    var cO = (function getCOFn() {
        var zoom = 0;
        return function cO(object) {
            if (object) {
                zoom = Math.max(zoom, object.level);
            }
            return zoom;
        };
    }());

    this.tiles.children[0].traverseVisible(cO);
    return cO();
};

Globe.prototype.computeDistanceForZoomLevel = function computeDistanceForZoomLevel(zoom, camera) {
    return camera.preSSE * Math.pow(this.tiles.minLevel, (this.tiles.maxLevel - zoom + 1)) / SSE_SUBDIVISION_THRESHOLD;
};

Globe.prototype.getTile = function getTile(coordinate) {
    return this.tiles.getTile(coordinate);
};

Globe.prototype.setRealisticLightingOn = function setRealisticLightingOn(bool) {
    this.atmosphere.setRealisticOn(bool);
    this.clouds.setLightingOn(bool);
};

export default Globe;
