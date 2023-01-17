ITowns is a javascript framework for 3D geographic data visualisation. 
It can display a wide range of data such as ortho-images, Digital Elevation Models (DEM) or 3D models.

ITowns is based on [Three.js](https://threejs.org/), which is a javascript library that implements WebGL to render sophisticated 3D Geometry on a webpage.

In this tutorial, we shall be introduced to the fundamentals of iTowns : how it displays geographic data.

***

## The View

The support to display anything within iTowns is called a `{@link View}`.

To provide geographic data visualization, a `{@link View}` contains a combination of [`Layers`]{@link Layer} which, in a digital map environment, are visual representations of any geographic data.
In other words, all data that are displayed using iTowns are supported by some `Layer`.

Each `View` in iTowns displays 3D data in a unique Coordinates Reference System (CRS). 
Yet, the data displayed within a `View` do not necessarily have to be in the `View`'s CRS.
ITowns comes with two pre-made `View` types : `{@link GlobeView}` and `{@link PlanarView}`.
Each of these allows visualizing data from different types (raster or vector) and from different CRS.
On this matter, iTowns distinguishes two cases : 

- The first one regards data that are to be displayed as raster. 
  These data can either be original raster data or vector data which are rasterized by iTowns and projected on the ground. 
  Data from this type are displayed in a `GlobeView` if their source CRS is [WGS 84](https://epsg.io/4326) or [Pseudo-Mercator](https://epsg.io/3857).
  However, if their source CRS defines a local projection (such as [RGF93 / Lambert 93](https://epsg.io/2154) for instance), they are displayed in a `PlanarView`.
- On another hand, vector data that are to be displayed as 3D objects can be displayed in any type of `View`, regardless of their source CRS since they can be converted by iTowns.

It is important to acknowledge the following facts regarding original raster data and `Views` :
- a `GlobeView` allows displaying multiple raster data from two different source CRS : [WGS 84](https://epsg.io/4326) and [Pseudo-Mercator](https://epsg.io/3857),
- a `PlanarView` allows displaying multiple raster data, but all those data sources must have the same CRS.

&rarr;[**`Visit GlobeView tutorial`**]{@tutorial Raster-data-WGS84}

&rarr;[**`Visit PlanarView tutorial`**]{@tutorial Raster-data-Lambert93}

***

## Protocols and data formats


ITowns comes with a wide range of compatible data sources. All available sources can be seen in the `Source` section of the
API documentation.
iTowns supports all the main geographic protocols: [Web Map Service](https://www.ogc.org/standards/wms) with `{@link WMSSource}`, 
[Web Map Tiled Service](https://www.ogc.org/standards/wmts) with `{@link WMTSSource}`, [Web Feature Service](https://www.ogc.org/standards/wfs)
with `{@link WFSSource}` and [Tile Map Service](https://wiki.osgeo.org/wiki/Tile_Map_Service_Specification) and XYZ with `{@link TMSSource}`.

iTowns also has sources for many data formats: [vector tile](https://docs.mapbox.com/help/glossary/vector-tiles/) resources from [MapBox](https://www.mapbox.com/) with `{@link VectorTilesSource}`, [Potree](https://github.com/potree/potree) (`{@link PotreeSource}`) and 
[Entwine](https://entwine.io/) (`{@link EntwinePointTileSource}`) 3D point clouds, [3DTiles](https://www.ogc.org/standards/3DTiles) 
mesh (b3dm) and point clouds (pnts) from web servers (`{@link C3DTilesSource}`) and from Cesium ion `{@link C3DTilesIonSource}`, 
[GeoJSON](https://geojson.org/) with `{@link FileSource}` and `{@link GeoJsonParser}`, 
[KML](https://www.ogc.org/standards/kml) with `{@link FileSource}` and `{@link KMLParser}`, [GPX](https://www.topografix.com/gpx.asp)
with `{@link FileSource}` and `{@link GpxParser}` and oriented images with `{@link OrientedImageSource}`.

It is also possible to create your own source and/or your own parser to read and add data from any format or protocol that is not supported by itowns.

***

## Layers

It was earlier mentioned that data are displayed as [`Layers`]{@link Layer} within iTowns. 
Several specific types of `Layers` exist, the use of which depends on the data to display :

- `{@link ColorLayer}` can be used to display raster graphics or vector data that needs to be rasterized to be projected on the ground (left picture in the table bellow),
- `{@link ElevationLayer}` can be used to display 3D elevation models (center picture in the table bellow),
- `{@link GeometryLayer}` can be used to display 2D vector data or 3D objects, such as geometric shapes or buildings modelling (right picture in the table bellow).
- `{@link FeatureGeometryLayer}` is a pre-configured `{@link GeometryLayer}` which simplifies its implementation in given cases (e.g. to extrude 3D buildings).
- `{@link PointCloudLayer}` can be used to display 3D point clouds. Any point cloud formats are supported as long as the corresponding `Source` is provided.
Some point clouds formats such as Potree, Las and Entwine already have parsers defined in itowns that you can use. For 3D Tiles point clouds (pnts), use
`C3DTilesLayer`.
- `{@link C3DTilesLayer}` can be used to display 3D Tiles layer (only b3dm and pnts).
- `{@link OrientedImageLayer}` can be used to display oriented images.


| ![color layer](images/Fundamentals-1.png) | ![elevation layer](images/Fundamentals-2.png) | ![geometry layer](images/Fundamentals-3.png) |
| :---: | :---: | :---: |
| A simple `ColorLayer` is displayed | An `ElevationLayer` is added to represent terrain elevation | A `GeometryLayer` is added to model the buildings |

Note that `{@link ColorLayer}` and `{@link ElevationLayer}` don't have their own geometry and are always *attached* to a `{@link GeometryLayer}` (generally the layer representing the geometry of the globe or of the plane). `{@link ColorLayer}` are projected onto this `{@link GeometryLayer}` and `{@link ElevationLayer}` are used to read elevation and to apply it to a `{@link GeometryLayer}`.

***

## Style

ITowns can display vector data in two ways : the data can be displayed in a `{@link View}` as 3D objects, or as entities that are projected on the ground.
You can see bellow pictures illustrating the two cases.

| ![flattened vector data](images/Fundamentals-4.png) | ![3d vector data](images/Fundamentals-5.png) |
| :---: | :---: |
| Vector data projected on the ground | Vector data display as 3D objects |

In both ways, the appearance and positioning of the vector data can be adjusted by modifying the `{@link Style}` parameter of the `Layer` the data are displayed in.
The `Style` in iTowns comes with several properties : 
- `fill` allows defining style rules for polygons interior,
- `stroke` allows defining style rules for lines and polygons edges,
- `point` allows defining style rules for points.

Each of these three properties comes with a bunch of parameters to set vector data appearance and positioning, such as `color`, `opacity`, `width`, `base_altitude`...
You can find a list of all the possible parameters in `Style` [documentation]{@link Style}.

These parameters can be set as static values or as functions of the vector data properties.
For example, let's suppose some vector data contains polygons.
Setting `fill.color` to `red` will color all the polygons in red.
If on another hand, all polygons come with a `color` property within the vector data, you can access it within `Style` in two ways :
- either by using brackets, which in our example results in setting `fill.color` to `'{color}'` ;
- or by passing a method to the `fill.color` value. 
  The first parameter of this method will automatically be an object containing all the properties of the vector data.
  In our example, the method could simply return the `color` property.

ITowns offers the possibility to display labels attached to points.
The content and appearance of the labels can be set the same way as for the polygons, lines and points : using a `Style` property which is called `text`.
For instance, setting `text.field` to `'{name}'` will display a label on each point that has a `name` property within the vector data.
The content of the label will be the content stored in the data under the `name` property.

### Vector data projected on the ground

When vector data are flattened on the ground, they are displayed in a `{@link ColorLayer}`. 
In that case, the data basically consist in polygons, lines or points.
Their appearance can be adjusted by modifying the `{@link Style}` of the `{@link ColorLayer}`. 
Yet, their positioning can't be modified since it is computed so that tey appear projected on the ground.

&rarr;[**`Visit tutorial`**]{@tutorial Vector-data-on-ground}

### Vector data displayed as 3D objects

In the case of vector data represented as 3D objects, the data are displayed in a `{@link GeometryLayer}`.
The appearance and positioning of the vector data can be adjusted by modifying the `{@link Style}` of the `{@link GeometryLayer}`.
Two parameters allow modifying the data position :
- `base_altitude` which defines the altitude at the base of the 3D objects ;
- `extrusion_height` which defines the height of the 3D objects, giving them volume.

For example, given a set of polygons, setting `fill.base_altitude` to `500` and `fill.extrusion_height` to `20` will render extruded polygon expanding between 500 and 520 meters of altitude.

&rarr;[**`Visit tutorial`**]{@tutorial Vector-data-3d}
