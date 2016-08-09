/**
 * Generated On: 2015-10-5
 * Class: ApiGlobe
 * Description: Classe façade pour attaquer les fonctionnalités du code.
 */



import Scene from 'Scene/Scene';
import Globe from 'Globe/Globe';
import Plane from 'Plane/Plane';
import BoundingBox from 'Scene/BoundingBox';
import WMTS_Provider from 'Core/Commander/Providers/WMTS_Provider';
import WMS_Provider from 'Core/Commander/Providers/WMS_Provider';
import SingleImageWMS_Provider from 'Core/Commander/Providers/SingleImage_Provider';
import TileProvider from 'Core/Commander/Providers/TileProvider';
import loadGpx from 'Core/Commander/Providers/GpxUtils';
import CoordCarto from 'Core/Geographic/CoordCarto';
import Ellipsoid from 'Core/Math/Ellipsoid';
import Projection from 'Core/Geographic/Projection';
import CustomEvent from 'custom-event';
import PointCloud from 'Scene/PointCloud';
import BoundingVolumeHierarchy from 'Scene/BoundingVolumeHierarchy';  // TODO: TEMP
import BuildingTile from 'Tiles/BuildingTile';  // TODO: TEMP
import BuildingTileNodeProcess from 'Tiles/BuildingTileNodeProcess';  // TODO: TEMP
import BuildingProvider from 'Core/Commander/Providers/BuildingProvider';  // TODO: TEMP

var loaded = false;
var eventLoaded = new CustomEvent('globe-loaded');
var eventLayerRemoved = new CustomEvent('Layer-removed');
var eventRange = new CustomEvent('rangeChanged');

function ApiGlobe() {
    //Constructor

    this.scene = null;
    //        this.nodeProcess = null;
    this.commandsTree = null;
    this.projection = new Projection();
    this.viewerDiv = null;

}

ApiGlobe.prototype.constructor = ApiGlobe;

//    var event = new Event('empty');
//    document.addEventListener('empty', console.log('Your turn'));
//    document.dispatchEvent(event);

/**
 * @param Command
 */
ApiGlobe.prototype.add = function( /*Command*/ ) {
    //TODO: Implement Me

};


/**
 * @param commandTemplate
 */
ApiGlobe.prototype.createCommand = function( /*commandTemplate*/ ) {
    //TODO: Implement Me

};

/**
 */
ApiGlobe.prototype.execute = function() {
    //TODO: Implement Me

};

ApiGlobe.prototype.getProtocolProvider = function(protocol) {
    return this.scene.managerCommand.getProtocolProvider(protocol);
}

/**
 * This function gives a chance to the matching provider to pre-process some
 * values for a layer.
 */
function preprocessLayer(layer, provider) {
    if (provider.preprocessDataLayer) {
        layer.tileInsideLimit = provider.tileInsideLimit.bind(provider);
        provider.preprocessDataLayer(layer);
    }
}

/**
 * This function adds an imagery layer to the scene. The layer id must be unique. The protocol rules wich parameters are then needed for the function.
 * @constructor
 * @param {Layer} layer.
 */
ApiGlobe.prototype.addImageryLayer = function(layer) {
    preprocessLayer(layer, this.scene.managerCommand.getProtocolProvider(layer.protocol));

    var map = this.scene.getMap();

    map.layersConfiguration.addColorLayer(layer);
};

ApiGlobe.prototype.addPointCloud = function(url) {
    var layers = this.scene.layers;
    for ( var l = 0; l < layers.length; l++ ) {
        var layer = layers[l].node;

        for (var sl = 0; sl < layer.children.length; sl++) {
            var sLayer = layer.children[sl];
            if (sLayer instanceof PointCloud) {
                sLayer.load(url);
                return;
            }
        }
    }
    throw new Error('No PointCloud layer');
};

ApiGlobe.prototype.setPointCloudVisibility = function(v) {
    var layers = this.scene.layers;
    for ( var l = 0; l < layers.length; l++ ) {
        var layer = layers[l].node;

        for (var sl = 0; sl < layer.children.length; sl++) {
            var sLayer = layer.children[sl];
            if (sLayer instanceof PointCloud) {
                for (var i=0; i<sLayer.children.length; i++) {
                    sLayer.children[i].visible = v;
                }
                return;
            }
        }
    }
}

ApiGlobe.prototype.moveLayerUp = function(layer) {

    this.scene.getMap().layersConfiguration.moveLayerUp(layer);
    this.scene.getMap().updateLayersOrdering();
    this.scene.renderScene3D();
};

ApiGlobe.prototype.moveLayerDown = function(layer) {

    this.scene.getMap().layersConfiguration.moveLayerDown(layer);
    this.scene.getMap().updateLayersOrdering();
    this.scene.renderScene3D();
};

ApiGlobe.prototype.moveLayerToIndex = function(layer, newId) {
    this.scene.getMap().layersConfiguration.moveLayerToIndex(layer, newId);
    this.scene.getMap().updateLayersOrdering();
    this.scene.renderScene3D();
};

ApiGlobe.prototype.removeImageryLayer = function(id) {

    if (this.scene.getMap().removeColorLayer(id)) {
        eventLayerRemoved.layer = id;
        this.viewerDiv.dispatchEvent(eventLayerRemoved);
        this.scene.getMap().updateLayersOrdering();
        this.scene.renderScene3D();
        return true;
    }

    return false;
};


/**
 * Add an elevation layer to the map. Elevations layers are used to build the terrain.
 * Only one elevation layer is used, so if multiple layers cover the same area, the one
 * with best resolution is used (or the first one is resolution are identical).
 * The layer id must be unique amongst all layers already inserted.
 * The protocol rules which parameters are then needed for the function.
 * @constructor
 * @param {Layer} layer.
 */

ApiGlobe.prototype.addElevationLayer = function(layer) {
    preprocessLayer(layer, this.scene.managerCommand.getProtocolProvider(layer.protocol));

    var map = this.scene.getMap();
    map.layersConfiguration.addElevationLayer(layer);
};

/**
 * Gets the minimum zoom level of the chosen layer.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/66r8ugq0/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {id} id - The id of the layer.
 */

ApiGlobe.prototype.getMinZoomLevel = function(id) {
    //console.log(this.addImageryLayer().id);
    var map = this.scene.getMap();
    var manager = this.scene.managerCommand;
    var providerWMTS = manager.getProvider(map.tiles).providerWMTS;
    var layerWMTS = providerWMTS.layersData;
    return layerWMTS[id].zoom.min;
};

/**
 * Return the list of all layers in the scene in the order of how they are stacked on top of each other.
 * @constructor
 * @param {id} id - The id of the layer.
 */

ApiGlobe.prototype.getLayers = function( /*param*/ ) {
    var map = this.scene.getMap();
    return map.layersConfiguration.getColorLayers();
};

/**
 * Gets the maximun zoom level of the chosen layer.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/y1xcqv4s/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {id} id - The id of the layer.
 */

ApiGlobe.prototype.getMaxZoomLevel = function(id) {
    //console.log(this.addImageryLayer().id);
    var map = this.scene.getMap();
    var manager = this.scene.managerCommand;
    var providerWMTS = manager.getProvider(map.tiles).providerWMTS;
    var layerWMTS = providerWMTS.layersData;
    return layerWMTS[id].zoom.max;
};

/**
 * Creates the scene (the globe of iTowns).
 * The first parameter is the coordinates on wich the globe will be centered at the initialization.
 * The second one is the HTML div in wich the scene will be created.
 * @constructor
 * @param {Coords} coords.
 * @params {Div} string.
 */

ApiGlobe.prototype.createSceneGlobe = function(coordCarto, viewerDiv) {
    // TODO: Normalement la creation de scene ne doit pas etre ici....
    // Deplacer plus tard

    this.viewerDiv = viewerDiv;

    viewerDiv.addEventListener('globe-built', function() {

        if (loaded == false) {

            loaded = true;
            viewerDiv.dispatchEvent(eventLoaded);
        }
    }, false);

    var gLDebug = false; // true to support GLInspector addon
    var debugMode = false;

    //gLDebug = true; // true to support GLInspector addon
    //debugMode = true;

    var ellipsoid = new Ellipsoid({
        x: 6378137,
        y: 6356752.3142451793,
        z: 6378137
    });

    this.scene = Scene(coordCarto, ellipsoid, viewerDiv, debugMode, gLDebug);

    var map = new Globe(ellipsoid, gLDebug);

    this.scene.add(map);

    // Test BoundingVolumeHierarchy

    var bvh = new BoundingVolumeHierarchy(BuildingTile, [{id:"0/1/4",bbox:[1845740.82505,5171978.17265,169.950021,1847591.88989,5174128.65401,246.4531]},{id:"0/1/0",bbox:[1837860.98027,5173155.88142,212.335584,1839705.26255,5174262.62047,313.297444]},{id:"0/1/1",bbox:[1839696.36526,5171941.91967,156.329993,1841897.85247,5174285.91092,338.722922]},{id:"0/1/2",bbox:[1841708.09015,5171921.3019,159.659973,1843874.66359,5174094.16246,210.586452]},{id:"0/1/3",bbox:[1843737.06688,5171802.20032,162.905499,1845902.48552,5174128.62589,224.057782]},{id:"0/0/4",bbox:[1845762.45189,5170806.14803,175.39446,1846940.04207,5172229.45668,223.4]},{id:"0/0/1",bbox:[1841438.76568,5171682.70222,164.474742,1841565.80615,5172014.45009,177.332452]},{id:"0/0/3",bbox:[1843724.93684,5170411.04828,162.981093,1846053.80175,5172267.49646,223.796189]},{id:"0/0/2",bbox:[1841785.73131,5170303.26842,157.988035,1843864.94833,5172174.32728,215.162702]},{id:"0/2/3",bbox:[1843749.53408,5173911.40267,162.604131,1846022.29786,5176061.92588,224.994627]},{id:"0/2/2",bbox:[1841663.99809,5173984.25176,162.329949,1843851.84595,5176096.53674,312.313726]},{id:"0/2/1",bbox:[1839574.05873,5173716.06149,165.538018,1842054.89113,5176191.39531,331.817784]},{id:"0/2/0",bbox:[1838645.50709,5174015.88478,172.322279,1839892.64343,5176059.28511,304.617805]},{id:"0/2/4",bbox:[1845704.28672,5173955.27624,171.557115,1847648.66845,5174872.51449,207.478248]},{id:"0/3/2",bbox:[1841798.00299,5175994.25753,163.925913,1843854.97253,5177629.24456,298.51247]},{id:"0/3/3",bbox:[1843466.68378,5175959.17764,160.080984,1844882.56823,5177744.54112,206.727073]},{id:"0/3/0",bbox:[1838995.61181,5175899.99259,167.630997,1839984.14871,5178124.04472,302.619835]},{id:"0/3/1",bbox:[1839638.41022,5175752.29651,160.835989,1841983.39523,5178145.57074,308.81372]},{id:"0/4/1",bbox:[1839703.8782,5177977.15874,166.512969,1841855.05949,5179908.35233,312.964996]},{id:"0/4/0",bbox:[1838794.22426,5177870.60234,246.858952,1839690.98937,5178253.54778,308.924243]},{id:"0/4/2",bbox:[1841738.64875,5178887.63625,162.201785,1842877.55355,5180280.04012,258.787845]}]);
    var np = new BuildingTileNodeProcess();
    this.scene.add(bvh, np);

    var buildingProvider = new BuildingProvider({srs: 'EPSG:3946'});

    var buildingLayer = {
        protocol: 'building',
        id: 'building'
    };
    this.scene.managerCommand.addProtocolProvider('building', buildingProvider);

    bvh.init(buildingLayer);

    // Fin test BoundingVolumeHierarchy

    // Register all providers
    var wmtsProvider = new WMTS_Provider({
        support: map.gLDebug
    });
    this.scene.managerCommand.addProtocolProvider('wmts', wmtsProvider);
    this.scene.managerCommand.addProtocolProvider('wmtsc', wmtsProvider);
    this.scene.managerCommand.addProtocolProvider('tile', new TileProvider(ellipsoid));
    this.scene.managerCommand.addProtocolProvider('single_image', new SingleImageWMS_Provider());
    this.scene.managerCommand.addProtocolProvider('wms', new WMS_Provider({support : map.gLDebug}));

    var wgs84TileLayer = {
        protocol: 'tile',
        id: 'l93',
        crs: 'epsg:3946'
    };

    preprocessLayer(wgs84TileLayer, this.scene.managerCommand.getProtocolProvider(wgs84TileLayer.protocol));
    map.layersConfiguration.addGeometryLayer(wgs84TileLayer);
    map.layersConfiguration.addGeometryLayer(buildingLayer);

    map.tiles.init(map.layersConfiguration.getGeometryLayers()[0]);

    //!\\ TEMP
    //this.scene.wait(0);
    //!\\ TEMP

    return this.scene;
};

    // TODO: move to ApiPlane
ApiGlobe.prototype.createScenePlane = function(coordCarto, viewerDiv, boundingBox) {
    // TODO: Normalement la creation de scene ne doit pas etre ici....
    // Deplacer plus tard

    this.viewerDiv = viewerDiv;

    viewerDiv.addEventListener('globe-built', function(){

        if(loaded == false)
        {

            loaded = true;
            viewerDiv.dispatchEvent(eventLoaded);
        }
    }
    , false);

    var gLDebug = false; // true to support GLInspector addon
    var debugMode = false;

    var bbox = new BoundingBox(boundingBox[0], boundingBox[1], boundingBox[2], boundingBox[3]);
    this.scene = Scene(coordCarto, bbox, viewerDiv,debugMode,gLDebug);

    var map = new Plane({bbox});

    this.scene.add(map);


    // Test BoundingVolumeHierarchy
    var bvh = new BoundingVolumeHierarchy(BuildingTile, [{id:"0/1/4",bbox:[1845740.82505,5171978.17265,169.950021,1847591.88989,5174128.65401,246.4531]},{id:"0/1/0",bbox:[1837860.98027,5173155.88142,212.335584,1839705.26255,5174262.62047,313.297444]},{id:"0/1/1",bbox:[1839696.36526,5171941.91967,156.329993,1841897.85247,5174285.91092,338.722922]},{id:"0/1/2",bbox:[1841708.09015,5171921.3019,159.659973,1843874.66359,5174094.16246,210.586452]},{id:"0/1/3",bbox:[1843737.06688,5171802.20032,162.905499,1845902.48552,5174128.62589,224.057782]},{id:"0/0/4",bbox:[1845762.45189,5170806.14803,175.39446,1846940.04207,5172229.45668,223.4]},{id:"0/0/1",bbox:[1841438.76568,5171682.70222,164.474742,1841565.80615,5172014.45009,177.332452]},{id:"0/0/3",bbox:[1843724.93684,5170411.04828,162.981093,1846053.80175,5172267.49646,223.796189]},{id:"0/0/2",bbox:[1841785.73131,5170303.26842,157.988035,1843864.94833,5172174.32728,215.162702]},{id:"0/2/3",bbox:[1843749.53408,5173911.40267,162.604131,1846022.29786,5176061.92588,224.994627]},{id:"0/2/2",bbox:[1841663.99809,5173984.25176,162.329949,1843851.84595,5176096.53674,312.313726]},{id:"0/2/1",bbox:[1839574.05873,5173716.06149,165.538018,1842054.89113,5176191.39531,331.817784]},{id:"0/2/0",bbox:[1838645.50709,5174015.88478,172.322279,1839892.64343,5176059.28511,304.617805]},{id:"0/2/4",bbox:[1845704.28672,5173955.27624,171.557115,1847648.66845,5174872.51449,207.478248]},{id:"0/3/2",bbox:[1841798.00299,5175994.25753,163.925913,1843854.97253,5177629.24456,298.51247]},{id:"0/3/3",bbox:[1843466.68378,5175959.17764,160.080984,1844882.56823,5177744.54112,206.727073]},{id:"0/3/0",bbox:[1838995.61181,5175899.99259,167.630997,1839984.14871,5178124.04472,302.619835]},{id:"0/3/1",bbox:[1839638.41022,5175752.29651,160.835989,1841983.39523,5178145.57074,308.81372]},{id:"0/4/1",bbox:[1839703.8782,5177977.15874,166.512969,1841855.05949,5179908.35233,312.964996]},{id:"0/4/0",bbox:[1838794.22426,5177870.60234,246.858952,1839690.98937,5178253.54778,308.924243]},{id:"0/4/2",bbox:[1841738.64875,5178887.63625,162.201785,1842877.55355,5180280.04012,258.787845]}]);
    var np = new BuildingTileNodeProcess();
    this.scene.add(bvh, np);

    var buildingProvider = new BuildingProvider({srs: 'EPSG:3946'});

    var buildingLayer = {
        protocol: 'building',
        id: 'building'
    };
    this.scene.managerCommand.addProtocolProvider('building', buildingProvider);

    bvh.init(buildingLayer);

    // Fin test BoundingVolumeHierarchy

    var nodeProcess = this.scene.layers[this.scene.layers.length - 1].process;
    nodeProcess.isCulled =
        function(node, camera) {
            return !this.frustumCullingOBB(node, camera);
        }.bind(nodeProcess);

    nodeProcess.prepare =
        function() {
        }.bind(nodeProcess);

    nodeProcess.computeNodeSSE =
        function(node, camera) {
            var vFOV = camera.FOV * Math.PI / 180;

            var diff = camera.camera3D.getWorldPosition().clone().sub(node.getWorldPosition());
            var d = Math.max(0.1, diff.length() - node.bbox.size * 0.5);
            var height = 2 * Math.tan( vFOV / 2 ) * d;

            var dot = diff.normalize().z;

            var ratio = (node.bbox.dimension.x * dot) / height;

            if (ratio >= 0.25) return 7;
            else return 1;
        }.bind(nodeProcess);

    // Register all providers

    var wmtsProvider = new WMTS_Provider({support : map.gLDebug});
    this.scene.managerCommand.addProtocolProvider('wmts', wmtsProvider);
    this.scene.managerCommand.addProtocolProvider('wmtsc', wmtsProvider);
    this.scene.managerCommand.addProtocolProvider('tile', new TileProvider(map.size, true));
    this.scene.managerCommand.addProtocolProvider('wms', new WMS_Provider({support : map.gLDebug}));
    this.scene.managerCommand.addProtocolProvider('single_image', new SingleImageWMS_Provider());

    var wgs84TileLayer = {
        protocol: 'tile',
        id:       'l93',
        crs: 'EPSG:3946'
    };

    preprocessLayer(wgs84TileLayer, this.scene.managerCommand.getProtocolProvider(wgs84TileLayer.protocol));
    map.layersConfiguration.addGeometryLayer(wgs84TileLayer);
    map.layersConfiguration.addGeometryLayer(buildingLayer);

    map.tiles.init(map.layersConfiguration.getGeometryLayers()[0]);

    //!\\ TEMP
    //this.scene.wait(0);
    //!\\ TEMP

    return this.scene;

};

ApiGlobe.prototype.update = function() {

    //!\\ TEMP
    this.scene.wait(0);
    //!\\ TEMP

};

// ApiGlobe.prototype.setLayerAtLevel = function(baseurl,layer/*,level*/) {
//     // TODO CLEAN AND GENERIC
//     var wmtsProvider = new WMTS_Provider({url:baseurl, layer:layer});
//     this.scene.managerCommand.providerMap[4] = wmtsProvider;
//     this.scene.managerCommand.providerMap[5] = wmtsProvider;
//     this.scene.managerCommand.providerMap[this.scene.layers[0].node.meshTerrain.id].providerWMTS = wmtsProvider;
//     this.scene.browserScene.updateNodeMaterial(wmtsProvider);
//     this.scene.renderScene3D();
// };

ApiGlobe.prototype.showClouds = function(value, satelliteAnimation) {

    this.scene.getMap().showClouds(value, satelliteAnimation);
    this.scene.renderScene3D();
};

ApiGlobe.prototype.setRealisticLightingOn = function(value) {

    this.scene.setLightingPos();
    this.scene.gfxEngine.setLightingOn(value);
    this.scene.getMap().setRealisticLightingOn(value);
    this.scene.browserScene.updateMaterialUniform("lightingOn", value ? 1 : 0);
    this.scene.renderScene3D();
};

/**
 * Sets the visibility of a layer. If the layer is not visible in the scene, this function will no effect until the camera looks at the layer.
 * @constructor
 * @param {id} string.
 * @params {visible} boolean.
 */

ApiGlobe.prototype.setLayerVisibility = function(id, visible) {

    this.scene.getMap().setLayerVisibility(id, visible);

    this.scene.renderScene3D();
};

ApiGlobe.prototype.animateTime = function(value) {

    this.scene.animateTime(value);
};

ApiGlobe.prototype.orbit = function(value) {

    this.scene.orbit(value);
};

/**
 * Sets the opacity of a layer. If the layer is not visible in the scene, this function will no effect until the layer becomes visible.
 * @constructor
 * @param {id} string.
 * @params {visible} boolean.
 */

ApiGlobe.prototype.setLayerOpacity = function(id, visible) {

    this.scene.getMap().setLayerOpacity(id, visible);
    this.scene.renderScene3D();
};

ApiGlobe.prototype.setStreetLevelImageryOn = function(value) {

    this.scene.setStreetLevelImageryOn(value);
}

/**
 * Returns the orientation angles of the current camera, in degrees.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/okfj460p/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 */
ApiGlobe.prototype.getCameraOrientation = function() {

    var tiltCam = this.scene.currentControls().getTilt();
    var headingCam = this.scene.currentControls().getHeading();
    return [tiltCam, headingCam];
};

/**
 * Returns the camera location projected on the ground in lat,lon.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/mjv7ha02/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 */

ApiGlobe.prototype.getCameraLocation = function() {
    var cam = this.scene.currentCamera().camera3D;
    return this.projection.cartesianToGeo(cam.position);
};

/**
 * Retuns the coordinates of the central point on screen.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/4tjgnv7z/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {Position} position
 */

ApiGlobe.prototype.getCenter = function() {

    var controlCam = this.scene.currentControls();
    return this.projection.cartesianToGeo(controlCam.globeTarget.position);
};

/**
 * Sets orientation angles of the current camera, in degrees.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/9qr2mogh/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Orientation} Param - The angle of the rotation in degrees.
 */

ApiGlobe.prototype.setCameraOrientation = function(orientation /*param,pDisableAnimationopt*/ ) {

    this.setHeading(orientation.heading);
    this.setTilt(orientation.tilt);
};

/**
 * Pick a position on the globe at the given position.
 * @constructor
 * @param {Number | MouseEvent} x|event - The x-position inside the Globe element or a mouse event.
 * @param {number | undefined} y - The y-position inside the Globe element.
 * @return {Position} postion
 */
ApiGlobe.prototype.pickPosition = function(mouse, y) {

    if (mouse)
        if (mouse.clientX) {
            mouse.x = mouse.clientX;
            mouse.y = mouse.clientY;
        } else {
            mouse.x = mouse;
            mouse.y = y;
        }

    var pickedPosition = this.scene.getPickPosition(mouse);

    this.scene.renderScene3D();

    return this.projection.cartesianToGeo(pickedPosition);
};

/**
 * Returns the tilt in degrees.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/kcx0of9j/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {Angle} number - The angle of the rotation in degrees.
 */

ApiGlobe.prototype.getTilt = function() {

    var tiltCam = this.scene.currentControls().getTilt();
    return tiltCam;
};

/**
 * Returns the heading in degrees.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/pxv1Lw16/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {Angle} number - The angle of the rotation in degrees.
 */

ApiGlobe.prototype.getHeading = function() {

    var headingCam = this.scene.currentControls().getHeading();
    return headingCam;
};

/**
 * Returns the "range": the distance in meters between the camera and the current central point on the screen.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/Lbt1vfek/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @return {Number} number
 */

ApiGlobe.prototype.getRange = function() {

    var controlCam = this.scene.currentControls();
    var ellipsoid = this.scene.getEllipsoid();
    var ray = controlCam.getRay();

    var intersection = ellipsoid.intersection(ray);

    //        var center = controlCam.globeTarget.position;
    var camPosition = this.scene.currentCamera().position();
    // var range = center.distanceTo(camPosition);
    var range = intersection.distanceTo(camPosition);

    return range;
};

/**
 * Change the tilt.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/p6t76zox/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Angle} Number - The angle.
 * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
 */

ApiGlobe.prototype.setTilt = function(tilt /*, bool*/ ) {

    this.scene.currentControls().setTilt(tilt);
};

/**
 * Change the heading.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/rxe4xgxj/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Angle} Number - The angle.
 * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
 */

ApiGlobe.prototype.setHeading = function(heading /*, bool*/ ) {

    this.scene.currentControls().setHeading(heading);
};

/**
 * Resets camera tilt -> sets the tilt to 0°.
 * @constructor
 * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
 */

ApiGlobe.prototype.resetTilt = function( /*bool*/ ) {

    this.scene.currentControls().setTilt(0);
};

/**
 * Resets camera heading -> sets the heading to 0°.
 * @constructor
 * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
 */

ApiGlobe.prototype.resetHeading = function( /*bool*/ ) {

    this.scene.currentControls().setHeading(0);
};

/**
 * Returns the distance in meter between two geographic positions.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/0nLhws5u/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Position} First - Position.
 * @param {Position} Second - Position.
 */

ApiGlobe.prototype.computeDistance = function(p1, p2) {
    return this.scene.getEllipsoid().computeDistance(new CoordCarto().setFromDegreeGeo(p1.longitude, p1.latitude, p1.altitude), new CoordCarto().setFromDegreeGeo(p2.longitude, p2.latitude, p2.altitude));
};

/**
 * Changes the center of the scene on screen to the specified coordinates.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/x06yhbq6/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Position} position - The position on the scene.
 */

ApiGlobe.prototype.setCenter = function(position) {
    //        var position3D = this.scene.getEllipsoid().cartographicToCartesian(position);
    var position3D = this.scene.getEllipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(position.longitude, position.latitude, position.altitude));
    this.scene.currentControls().setCenter(position3D);
};

/**
 * Changes the center of the scene on screen to the specified coordinates.
 * This function allows to change the central position, the zoom level, the range, the scale and the camera orientation at the same time.
 * The level has to be between the [getMinZoomLevel(), getMaxZoomLevel()].
 * The zoom level and the scale can't be set at the same time.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/7yk0mpn0/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Position} pPosition - The detailed position in the scene.
 * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
 */

ApiGlobe.prototype.setCenterAdvanced = function(pPosition /*, pDisableAnimationopt*/ ) {
    this.setCenter(pPosition.position);
    this.setRange(pPosition.range);
    this.setHeading(pPosition.heading);
    this.setTilt(pPosition.tilt);
};

/**
 * Sets the "range": the distance in meters between the camera and the current central point on the screen.
 * <iframe width="100%" height="400" src="//jsfiddle.net/iTownsIGN/Lt3jL5pd/embedded/" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
 * @constructor
 * @param {Number} pRange - The camera altitude.
 * @param {Boolean} [pDisableAnimation] - Used to force the non use of animation if its enable.
 */

ApiGlobe.prototype.setRange = function(pRange /*, bool*/ ) {
    var viewerDiv = document.getElementById("viewerDiv");

    this.scene.currentControls().setRange(pRange);
    viewerDiv.dispatchEvent(eventRange);
};

/**
 * Returns the actual zoom level. The level will always be between the [getMinZoomLevel(), getMaxZoomLevel()].
 * @constructor
 * @param {Id} id - The id of a layer.
 */

ApiGlobe.prototype.getZoomLevel = function(id) {
    return this.scene.getMap().getZoomLevel(id);
};

ApiGlobe.prototype.launchCommandApi = function() {

    //this.removeImageryLayer('ScanEX');

    //        console.log(this.getMinZoomLevel("IGNPO"));
    //        console.log(this.getMaxZoomLevel("IGN_MNT"));
    //        console.log(this.getCenter());
    //        console.log(this.getCameraLocation());
    //        console.log(this.getCameraOrientation());
    //        console.log(this.getZoomLevel());
    //        console.log(this.pickPosition());
    //        console.log(this.getTilt());
    //        console.log(this.getHeading());
    //       console.log(this.getRange());
    //        this.setTilt(45);
    //        this.setHeading(180);
    //        this.resetTilt();
    //        this.resetHeading();
    //        var p1 = new CoordCarto(2.4347047,48.8472568,0);
    //        var p2 = new CoordCarto(2.4345599,48.8450221,0);
    //        console.log(this.computeDistance({longitude:2.4347047,latitude:48.8472568,altitude:0},{longitude:2.4345599,latitude:48.8450221,altitude:0}));

    //var p = new CoordCarto(-74.0059700 ,40.7142700,0); //NY

    //        var p = new CoordCarto().setFromDegreeGeo(coordCarto.lon, coordCarto.lat, coordCarto.alt))
    //        var p = new CoordCarto().setFromDegreeGeo(2,20,0); //NY
    //
    //        this.setCenter(p);
    //        var p2 = new CoordCarto().setFromDegreeGeo(2.4347047,48.8472568,0); //Paris
    //        this.setCenter(p2);
    //        this.setCenter({lon:-74,lat:40, alt:0});
    //        this.testTilt();
    //        this.testHeading();
    //console.log("range 1  " + this.getRange());
    //        this.setRange(1000);
    //        console.log(this.getRange());
    //        this.setCameraOrientation({heading:45,tilt:30});
    //        this.setCenterAdvanced({position:p2, /*range:10000,*/ heading:180, tilt:70});
};

//    ApiGlobe.prototype.testTilt = function (){
//        this.setTilt(45);
//        console.log(this.getTilt());
//        this.resetTilt();
//        console.log(this.getTilt());
//    };
//
//    ApiGlobe.prototype.testHeading = function (){
//        this.setHeading(90);
//        console.log(this.getHeading());
//        this.resetHeading();
//        console.log(this.getHeading());
//    };

ApiGlobe.prototype.showKML = function(value) {

    this.scene.getMap().showKML(value);
    this.scene.renderScene3D();
};


ApiGlobe.prototype.loadGPX = function(url) {
    loadGpx(url, this.scene.getEllipsoid()).then(function(gpx){
        if(gpx) {
            this.scene.getMap().gpxTracks.children[0].add(gpx);
        }
    }.bind(this));

    this.scene.renderScene3D();
};


export default ApiGlobe;
