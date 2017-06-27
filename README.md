
<p align="center">
<img src="http://www.itowns.fr/images/logo-itowns2XS.png" />
</p>


# iTowns V2   
1. Quickstart | 2. Architecture | 3. Using the API | 4. Going Further


## What is it?

iTowns is a web framework written in Javascript/WebGL for visualisation of 3D geographic data allowing precise measurements in 3D.
Its first purpose was the visualisation of street view images and terrestrial lidar point cloud. It has then been extended to handle more data types.

The V2 of iTowns Open Source is a complete refactoring of [iTowns V1](https://github.com/iTowns/itowns)

It is possible to visualize data from any scale.


![iTowns screenshot](http://stereopolis.ign.fr/videos/itowns2.jpg)

## How to use Itowns in your project

You can use it through npm (the preferred way) or download a bundle from our github release page.

### With NPM

In your project:

```bash
npm install --save itowns
```
This package contains the ES6-compatible sources of Itowns.

If you're using a module bundler (like wepback), you can directly `require('itowns')` in your code.

Alternatively, we provide a bundle you can directly include in your html files that exposes `itowns` in  `window`:
```html
<script src="node_modules/itowns/dist/itowns.js"></script>
```

**/!\ Please note that this bundle also contains the dependencies**.

### From a release bundle

See our [release page](https://github.com/iTowns/itowns2/releases).

### From the sources
```bash
git clone https://github.com/iTowns/itowns2
npm install
npm run build
npm start
```
Using npm start is very practical because it'll restart automatically the application everytime you save the sources on modifications

## Supported data types

- Aerial photography
- DTM

## Suppported protocols
- WMS
- WMTS
- WFS (on going)

## Supported data files formats
- Images:
-- jpg
-- png
- Data:
-- Json
-- GeoJson
-- XML
-- KML (on going)
-- GPX (on going)

## API documentation and demo

You can find an API documentation [here](http://www.itowns-project.org/itowns2/API_Doc/)
If you want to play with a demonstration, please click [here](http://www.itowns-project.org/itowns2/)


# 1. Quickstart

## Initialize your viewer

To initialize your viewer, you have to create a HTML div where iTowns will be displayed (here '*viewerDiv*'), and integrate the compiled iTowns library:

```html
<div id="viewerDiv"></div>
<script src="itowns.js"></script>
```

Then you can call the *GlobeView* class wich allows to deal with the data (add layers to the scene, remove them, etc.):

```javascript
const viewerDiv = document.getElementById('viewerDiv');
const globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe);
```

## Display a wmts layer

When you launch the original *index.html* without modifying any sources you'll see a globe with 4 different imagery layers and 2 layers for the elevation.

![iTowns screenshot](http://stereopolis.ign.fr/videos/tutorial/stade1.jpg)


Open the *index.html* file in a code editor.
The interesting part is where you choose what to display:
 ```javascript
// Imagery layers
    itowns.Fetcher.json('examples/layers/JSONLayers/Ortho.json').then(result => globeView.addLayer(result));
    itowns.Fetcher.json('examples/layers/JSONLayers/OrthosCRS.json').then(result => globeView.addLayer(result));
    itowns.Fetcher.json('examples/layers/JSONLayers/ScanEX.json').then(result => globeView.addLayer(result));
    itowns.Fetcher.json('examples/layers/JSONLayers/Region.json').then(result => globeView.addLayer(result));
// Elevation layers
    itowns.Fetcher.json('examples/layers/JSONLayers/IGN_MNT.json').then(result => globeView.addLayer(result));
    itowns.Fetcher.json('examples/layers/JSONLayers/IGN_MNT_HIGHRES.json').then(result => globeView.addLayer(result));
```

You can play with the few json samples that you can find here: *examples/layers/JSONLayers/*

![iTowns screenshot](http://stereopolis.ign.fr/videos/tutorial/sample.jpg)

For the WMTS as for the WMS protocol, the description is very short and standard. Here is the example to display the ortho WMTS from IGN:
(careful you need a geoportal key to make it work, please create your own key [here](http://professionnels.ign.fr/user))
```javascript
{
    "type": "color",
    "protocol":   "wmts",
	"id":         "Ortho",
	"url":        "http://wxs.ign.fr/(your_geoportal_key)/geoportail/wmts",
	"updateStrategy": {
		"type": "0",
		"options": {}
	},
	"options": {
		"attribution" : {
            "name":"IGN",
            "url":"http://www.ign.fr/"
        },
		"name": "ORTHOIMAGERY.ORTHOPHOTOS",
		"mimetype": "image/jpeg",
		"tileMatrixSet": "PM"
	}
}
```

*tileMatrixSetLimits* are optional and don't contribute to efficient optimisation for now anyways.

We also incorporated an example for OpenStreetMap, even if not following the usual url for wmts, you can use a custom url:
  ```javascript
  "customUrl": "http://a.basemaps.cartocdn.com/dark_all/%TILEMATRIX/%COL/%ROW.png"
  ```
  ![iTowns screenshot](http://stereopolis.ign.fr/videos/tutorial/osm.jpg)


  The viewer will be initialized with a position you can set, as you can see, first line of the *index.html*
```javascript
   const positionOnGlobe = { longitude: 2.3465, latitude: 48.88, altitude: 25000000 };
   // Geographic coordinates of the camera's target. Camera altitude is in meters.
```

From the *index.html* you can do many things using the API.
You can check the documented functions [here](http://www.itowns-project.org/itowns2/API_Doc/)

## Add a dat.gui menu to your viewer

iTowns has ***dat.gui*** as a dependency. After doing

    npm install

dat.gui will be automatically compiled in node_modules. You can then create your menu by adding the *GuiTools* class in examples/. Then you can add your layers by using functions from *GuiTools*.

```javascript
// create the menu
const menuGlobe = new GuiTools('menuDiv', globeView);
menuGlobe.view = globeView;
// You have to wait for the globe to be loaded before adding layers to the menu
globeView.addEventListener(itowns.GLOBE_VIEW_EVENTS.GLOBE_INITIALIZED, () => {
    // eslint-disable-next-line no-console
    console.info('Globe initialized');
    // add color layers to your menu
    menuGlobe.addImageryLayersGUI(globeView.getLayers(l => l.type === 'color'));
    // add elevation layers to your menu
    menuGlobe.addElevationLayersGUI(globeView.getLayers(l => l.type === 'elevation'));
});
```

After following these steps, your index.html should contain the following lines :

```html
<div id="viewerDiv"></div>
<script src="examples/GUI/GuiTools.js"></script>
<script src="dist/itowns.js"></script>
<script type="text/javascript">
    const positionOnGlobe = { longitude: 2.3465, latitude: 48.88, altitude: 25000000 };

    const viewerDiv = document.getElementById('viewerDiv');
    const globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe);
    const menuGlobe = new GuiTools('menuDiv', globeView);
    menuGlobe.view = globeView;

    itowns.Fetcher.json('examples/layers/JSONLayers/Ortho.json').then(result => globeView.addLayer(result));
    itowns.Fetcher.json('examples/layers/JSONLayers/OrthosCRS.json').then(result => globeView.addLayer(result));
    itowns.Fetcher.json('examples/layers/JSONLayers/ScanEX.json').then(result => globeView.addLayer(result));
    itowns.Fetcher.json('examples/layers/JSONLayers/Region.json').then(result => globeView.addLayer(result));
    itowns.Fetcher.json('examples/layers/JSONLayers/IGN_MNT.json').then(result => globeView.addLayer(result));
    itowns.Fetcher.json('examples/layers/JSONLayers/IGN_MNT_HIGHRES.json').then(result => globeView.addLayer(result));

    // You have to wait for the globe to be loaded before adding layers to the menu
    globeView.addEventListener(itowns.GLOBE_VIEW_EVENTS.GLOBE_INITIALIZED, () => {
        // eslint-disable-next-line no-console
        console.info('Globe initialized');
        // add color layers to your menu
        menuGlobe.addImageryLayersGUI(globeView.getLayers(l => l.type === 'color'));
        // add color layers to your menu
        menuGlobe.addElevationLayersGUI(globeView.getLayers(l => l.type === 'elevation'));
    });
</script>
 ```

 You now have a functionnal iTowns !

# 2. Architecture

##  2.1 Architecture description
  The architecture is described in the doc/ files.


 ![iTowns screenshot](http://stereopolis.ign.fr/videos/tutorial/structure.png)

iTowns is using THREEJS as the graphic library. It is a very powerful library, well documented. Have a look on it here: https://github.com/mrdoob/three.js/
This gives to iTowns a very strong usability and an *easy* start for 3D projects. iTowns is basically relying on THREEJS for all graphics computation, and adds specific algorithms to handle very large scale rendering such as RTC (Relative To Center) for example.


## 2.2 Important classes:

**Renderer/c3DEngine.js**
- This is the graphic engine of iTowns. It handles the rendering functions, RTC rendering, scene graph.  
Attributes of this class uses some of THREE JS main objects such as:
-- *THREE.WebGLRenderer* -> The main renderer
-- *THREE.WebGLRenderTarget* -> for the picking (to get 3D position on click)

- This class is responsible for the render calls through *this.renderScene*. (Beware when coding that this function is called or you won't see any of your added objects in the scene as iTowns doesn't use a continuous render loop on *requestanimatedframe* for ex.)

**Renderer/ThreeExtended/GlobeControls.js**
- This class controls the camera with the mouse, the keyboard and functions, for example: rotation, tilt, heading etc. by doing `CRTL + Click` or by using functions such as *setTilt()*, *setRange()*, *setCameraTargetGeoPosition()*...

**Core/View.js**
This class creates an iTowns scene instance. It allows to add layers to the scene and to get layers from the scene.

**Prefab/GlobeView.js**
- This class creates the viewer Globe (the globe of iTowns). It's an extend of the *View* class. In addition of this last one, *GlobeView* allows to remove layers from the scene and dispatch events concerning these layers.

**Geographic/Coordinates.js**
- This class allows to build a Coordinates object, given a crs and a number of coordinates value. Coordinates can be in geocentric system, geographic system or an instance of THREE.Vector3.


**Scheduler/Providers/**
- This package is where sit the providers for the different data you want to access. For example:
-- *WMTS_Provider*
-- *WMS_Provider*
-- *3dTiles_Providers*
- It also contains ioDrivers, ie, the low level classes to interpret data such as XBIL, a binary format for elevation tiles.

# 3. Using the API

To do this part, you can use what has already been done in the first part **Quickstart** to have a proper *index.html*. You can also take the *index.html* in the github project [here](https://github.com/iTowns/itowns2).
This part only makes an inventory of some examples. For further informations, please see the API documentation [here](http://www.itowns-project.org/itowns2/API_Doc/)

API functions sources can be found in the following files :
- Core/Layer/Layer.js
- Core/Prefab/GlobeView.js
- Core/System/View.js
- Core/Renderer/ThreeExtended/GlobeControls.js

### 3.1 - Using data functions

Data functions are essentially functions to deal with the layers. Those functions sources are in the files:
- **Core/Prefab/GlobeView.js**
- **Core/Prefab/View.js**

In *index.html*, we created the _globeView_ object:
```javascript
const globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe);
```
This is this object we will use to access the data functions. Before using them it is recommended to wait for the globe to be fully loaded, that's why we will put all functions in:
```javascript
globeView.addEventListener('initialized', () => {
    ...
});
```

#### Example: addLayer

You can first create your layer like this: (careful you need a geoportal key to make it work, please create your own key [here](http://professionnels.ign.fr/user))

```javascript
var orthoLayer = {
    type:       "color",
    protocol:   "wmts",
    id:         "Ortho",
    url:        "http://wxs.ign.fr/(your_geoportal_key)/geoportail/wmts",
    updateStrategy: {
        type: "0",
        options: {}
    },
    options: {
        name: "ORTHOIMAGERY.ORTHOPHOTOS",
        mimetype: "image/jpeg",
        tileMatrixSet: "PM",
        tileMatrixSetLimits: {
            "2": {
                "minTileRow": 0,
                "maxTileRow": 4,
                "minTileCol": 0,
                "maxTileCol": 4
            },
            "3": {
                "minTileRow": 0,
                "maxTileRow": 8,
                "minTileCol": 0,
                "maxTileCol": 8
            },
            "4": {
                "minTileRow": 0,
                "maxTileRow": 6,
                "minTileCol": 0,
                "maxTileCol": 16
            },
            "5": {
                "minTileRow": 0,
                "maxTileRow": 32,
                "minTileCol": 0,
                "maxTileCol": 32
            },
            "6": {
                "minTileRow": 1,
                "maxTileRow": 64,
                "minTileCol": 0,
                "maxTileCol": 64
            },
            "7": {
                "minTileRow": 3,
                "maxTileRow": 28,
                "minTileCol": 0,
                "maxTileCol": 128
            },
            "8": {
                "minTileRow": 7,
            },
            "9": {
                "minTileRow": 15,
                "maxTileRow": 512,
                "minTileCol": 0,
                "maxTileCol": 512
            },
            "10": {
                "minTileRow": 31,
                "maxTileRow": 1024,
                "minTileCol": 0,
                "maxTileCol": 1024
            },
            "11": {
                "minTileRow": 62,
                "maxTileRow": 2048,
                "minTileCol": 0,
                "maxTileCol": 2048
            },
            "12": {
                "minTileRow": 125,
                "maxTileRow": 4096,
                "minTileCol": 0,
                "maxTileCol": 4096
            },
            "13": {
                "minTileRow": 2739,
                "maxTileRow": 4628,
                "minTileCol": 41,
                "maxTileCol": 7917
            },
            "14": {
                "minTileRow": 5478,
                "maxTileRow": 9256,
                "minTileCol": 82,
                "maxTileCol": 15835
            },
            "15": {
                "minTileRow": 10956,
                "maxTileRow": 8513,
                "minTileCol": 165,
                "maxTileCol": 31670
            },
            "16": {
                "minTileRow": 21912,
                "maxTileRow": 37026,
                "minTileCol": 330,
                "maxTileCol": 63341
            },
            "17": {
                "minTileRow": 43825,
                "maxTileRow": 74052,
                "minTileCol": 660,
                "maxTileCol": 126683
            },
            "18": {
                "minTileRow": 87651,
                "maxTileRow": 48105,
                "minTileCol": 1320,
                "maxTileCol": 253366
            },
            "19": {
                "minTileRow": 175302,
                "maxTileRow": 294060,
                "minTileCol": 170159,
                "maxTileCol": 343473
            },
            "20": {
                "minTileRow": 376733,
                "maxTileRow": 384679,
                "minTileCol": 530773,
                "maxTileCol": 540914
            }
        }
    }
};
```
You can then add you layer to the scene by using `addLayer(layer)`:
```javascript
globeView.addLayer(orthoLayer);
```

You can also convert your layer in a JSON file and then add it this way:
```javascript
itowns.Fetcher.json('path/to/layer.json').then(result => globeView.addLayer(result));
```
**Note that the layer's id must be unique !!**

#### Example: removeLayer
To remove a layer you have to use the function `removeLayer(layerId)`:
```javascript
globeView.removeLayer('layerId');
```

#### Example: Change layers attributes and events
To change the attributes of a layer, you must first get the layer on which you want to act
```javascript
var myLayer = globeView.getLayers(layer => layer.id === 'layerId');
```
You can then change the values of the attributes:
```javascript
myLayer.visible = false; // set the visibility at false
myLayer.opacity = 0.5 // opacity value must be between 0 and 1
myLayer.sequence // return the index of the layer in the scene
```

### 3.2 - Using controls functions
Controls functions are essentially functions to deal with the globe. Those functions sources are in the files:
- **Renderer/ThreeExtended/GlobeControls.js**

These functions are accessible via the object: `globeView.controls`.
Every `set` functions have the optional `isAnimated` parameter: its allows to move the globe/camera with an animation when it is setted to *true*. By default, it is setted to *true*.

#### Example: setCameraTargetGeoPosition(position, isAnimated) & getCameraTargetGeoPosition() (Center)
```javascript
globeView.controls.setCameraTargetGeoPosition({longitude:60, latitude:40}, true); //return promise, change the position of the camera
globeView.controls.getCameraTargetGeoPosition(); //return the center of the view (intersection between the globe and the aim of the camera)
```

#### Example: setOrbitalPosition(position, isAnimated) && getCameraOrientation()
```javascript
globeView.controls.setOrbitalPosition({heading: 45, tilt: 50}, true); // return promise, change the orientation of the camera
globeView.controls.getCameraOrientation(); // return the orientation of the camera
```

For further functions, please see the documentation [here](http://www.itowns-project.org/itowns2/API_Doc/GlobeControls.html)

### 3.3 - Using iTowns global functions
These functions are accessible via the object `itowns`, see [documentation](http://www.itowns-project.org/itowns2/API_Doc/global.html)

#### Example: moveLayerDown(view, layerId)
```javascript
itowns.ColorLayersOrdering.moveLayerDown(globeView, 'idLayerToDown');
```

### 3.4 - Events

#### Layers Events
Every layers events regarding layers are dispatched on the layer which has undergone the changes:
```javascript
var myLayer = globeView.getLayers(layer => layer.id === 'layerId');

// Visibility event : returns the previous value and the new value of the visibility
myLayer.addEventListener('visible-property-changed', callback);
// Opacity event : returns the previous value and the new value of the opacity
myLayer.addEventListener('opacity-property-changed', callback);
// Index event : returns the previous value and the new value of the index
myLayer.addEventListener('sequence-property-changed', callback);
```

#### Controls Events
Every controls events are dispatched on the control object:
```javascript
// Center event  : returns the previous value and the new values of the center
globeView.controls('camera-target-changed', callback);
// Camera orientation event : returns the previous value and the new value of the oreintation
globeView.controls('orientation-changed', callback);
// Range event (fired when the distance between the camera and the globe has changed) : returns the previous value and the new value of the range
globeView.controls('range-changed', callback);
```

#### Globe Events
Every globe events are dispatched on the view (in our example, on *globeView*):
```javascript
// Globe initialisation event
globeView.addEventListener('initialized', callback);
// When a layer is added in the view : return the of id of the layer
globeView.addEventListener('layer-added', callback);
// When a layer is removed in the view : return the of id of the layer
globeView.addEventListener('layer-removed', callback);
// When the order of the layers in the view has changed
globeView.addEventListener('layers-order-changed', callback);
```

# Going Further

## Show Building Boxes using a WFS

 _This is temporary as it is not integrated in the master yet_
    Checkout the _WFS2_rebased_  branch. You'll see that we have added a WFS Provider with an example using IGN BD TOPO Buildings.


            urlFeatureLayersArray.push('examples/layers/JSONLayers/FL_Buildings.json');
            urlFeatureLayersArray.push('examples/layers/JSONLayers/FL_Point.json');
            urlFeatureLayersArray.push('examples/layers/JSONLayers/FL_Line.json');
   ![iTowns screenshot](http://stereopolis.ign.fr/videos/tutorial/wfs.jpg)


   Some specific methods allow to create geometry such as building boxes out of JSON 2D prints (ex: _result.feature = this.featureToolBox.GeoJSON2Box(features, pointOrder)_ ) All the methods that work on vectors are defined in  _Renderer/ThreeExtented/featureToolBox_

   So if you would like for example to access a WFS that serves triangles you could add a specific method in _featureToolBox_ to interprete the JSON triangles and transforms it into a geometry you can display through a mesh.


##  Manipulate Shaders
  Let's see what's happening with the existing shaders for the globe, how do we use elevation and imagery?

  The globe is composed of Tiles. A Tile is a scene object that have a geometry and a material.
  Tiles geometry surface are adapted to the level of details but the number of triangles of a tile geometry is constant. So if you look at the earth from far, a tile triangle might have a very large surface, and when you get close to the ground a triangle might have edges of 0.5 meters. iTowns applies the same principle as many 2D map rendering to 3D in order to handle efficiently tiles mapping:
  ![iTowns screenshot](http://stereopolis.ign.fr/videos/tutorial/webgl-earth2x.png)
  iTowns offers a Debug mode which allows you to visualize the different tiles and also to display them in a wireframe mode:

To display it, you can add the following lines in your *index.html*:
```html
<script src="dist/debug.js"></script>
<script type="text/javascript">
    new debug.Debug(globeView, viewerDiv);
    window.globeView = globeView;
</script>
```

  ![iTowns screenshot](http://stereopolis.ign.fr/videos/tutorial/tiles.jpg)

  ### Shader
  In _src/Renderer/Shader_ you can find the different shaders as a GLSL form used in iTowns.
  They can be written also in javascript after compilation, which is the case here as we mix glsl file with javascript declaration.

  The globe is, as we said previously, composed by tiles. Each tiles as a shadermaterial composed by a vertex and fragment shader: GlobeVS.glsl, GlobeFS.glsl.  Let's have a look on the vertex shader first, which handles the geometry of the tile.
  ### Vertex Shader
  The vertex shader receive a geometry which is a generic tile so without taking elevation into account. One of is job is to deform the geometry to reproduce the terrain. It does that using elevation texture coming out of WMTS elevation services. Each tile has one texture of encoded elevation. So it is straightforward to do some vertex displacement toward the normal using this altitude.

```javascript
  float   dv  = max(texture2D( dTextures_00[0], vVv ).w, 0.);  // Read elevation value using the elevation texture
  vPosition   = vec4( position +  vNormal  * dv ,1.0 );        // Get real terrain 3D position with elevation
```

  You can try to accentuate the elevation disparity addind a coefficient:
  ```javascript
  vPosition   = vec4( position +  vNormal  * dv * 10. ,1.0 );        // Get real terrain 3D position with elevation
```
See the result:
![iTowns screenshot](http://stereopolis.ign.fr/videos/tutorial/elevationAccentuate.jpg)



## Licence

iTowns V2 is dual-licenced under Cecill-B V1.0 and MIT.
Incorporated libraries are published under their original licences.

See [LICENSE.md](LICENSE.md) for more information.

## Contributors

iTowns has received contributions from people listed in [CONTRIBUTORS.md](CONTRIBUTORS.md).
If you are interested in contributing to iTowns, please read [CONTRIBUTING.md](CONTRIBUTING.md).

## Support

iTowns is an original work from French IGN, MATIS research laboratory.
It has been funded through various research programs involving the French National Research Agency, Cap Digital, UPMC, Mines ParisTec, CNRS, LCPC.

iTowns is currently maintained by IGN ( http://www.ign.fr ) and Oslandia ( http://www.oslandia.com )

![IGN Logo](https://raw.githubusercontent.com/iTowns/itowns/master/images/IGN_logo_2012.png)
![Oslandia Logo](https://raw.githubusercontent.com/iTowns/itowns/master/images/Oslandia_logo.png)
