# Monorepo Roadmap 

## PR packages improvement
 * Add feature Geodesy package
   * **Place/orienting/scaling a object3D in geographic system in real time**, replace part of code by this new feature, in these classes :
      - FeatureProcessing
      - Feature
      - TileMesh/Tiled
      - examples

* **Widgets**
	- Make public and publish 

* **Debug**
	- rewrite debug

## iTowns Core package with private sub-packages 
 * Data and styling
  	* **New Class** : `Quadree spatialization`
		- Make standalone `FeatureGeometryLayer`
		- Replace the code in `TiledGeometryLayer`
 	* Loaders : Sources and Parsers
	* Style
 * Make generic processing classes (remove `TiledLayer` dependency)
	* `Fetcher, Scheduler, Mainloop` 
 * THREE Tools
	* Three Extended and rendering Methods
    * Converters : Data to THREE.js

## 2 Standalone public packages (usable directly with THREE.js)

 * **Terrain**
 	* TiledGeometryLayer -> devrait servir pour 3D WFS
 	* GlobeLayer and PlanarLayer
 	* Elevations and Color Layers

 * **3D Layers** (it could be split in subpackages)
 	* FeatureGeometryLayer
 	* 3d Tiles
 	* Points
 	* Projection Layer

 ## Viewing and interactiviting

 	* Picking
 	* handling the multi projection convertion
 	* Camera/Viewer
 	* Controls

## To remove 

* Providers

