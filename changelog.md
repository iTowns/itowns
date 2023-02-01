<a name="2.39.0"></a>
# [2.39.0](https://github.com/iTowns/itowns/compare/v2.38.2...v2.39.0) (2023-01-04)


### Features

* **3dtiles:** add support for binary batch table ([47325ab](https://github.com/iTowns/itowns/commit/47325ab))
* add a npm build task creating a non minified version ([48a24fa](https://github.com/iTowns/itowns/commit/48a24fa))
* **debug:** add altitude to displayed coordinates. ([e1fea9f](https://github.com/iTowns/itowns/commit/e1fea9f))
* **globeControls:** add configuration parameters and documentation ([cdd865c](https://github.com/iTowns/itowns/commit/cdd865c))
* **globeView:** allow to configure globeControls when creating a globeView ([821e522](https://github.com/iTowns/itowns/commit/821e522))


### Bug Fixes

* **3dtiles:** fix and document 3d tiles material overriding ([8ade709](https://github.com/iTowns/itowns/commit/8ade709))
* **3dtiles:** fix layer opacity and visibility change for 3d tiles pnts ([059fe5e](https://github.com/iTowns/itowns/commit/059fe5e))
* **3dtiles:** handle tilesets with cesium specific uniforms in shaders ([04f8b40](https://github.com/iTowns/itowns/commit/04f8b40))
* **3dtiles:** use correct batch table constructor for pnts tiles ([e1dbd63](https://github.com/iTowns/itowns/commit/e1dbd63))
* change THREE.Math to THREE.MathUtils ([826b5bd](https://github.com/iTowns/itowns/commit/826b5bd))
* **Feature2Texture:** prevent drawing points if they lack style ([5706e6f](https://github.com/iTowns/itowns/commit/5706e6f))
* **gltf:** fix parsing of khr_binary_extension in gltf 1.0 files ([2bf9d2d](https://github.com/iTowns/itowns/commit/2bf9d2d))
* **LayeredMaterial:** fix opacity when initialized to 0 ([deac41e](https://github.com/iTowns/itowns/commit/deac41e))
* **picking:** fix picking on multiple layers ([5c2f578](https://github.com/iTowns/itowns/commit/5c2f578))
* **Scheduler:** replace url subdomains alternatives ([91fd9ec](https://github.com/iTowns/itowns/commit/91fd9ec))
* **view:** fix view resize when width or height is 0 ([dbd9ee3](https://github.com/iTowns/itowns/commit/dbd9ee3))
* **wfs, wms, wmts:** support urls ending with or without ? character ([f44dfb2](https://github.com/iTowns/itowns/commit/f44dfb2))


### Performance Improvements

* **demutils:** texture data read optimization in elevation measurement ([9ee991c](https://github.com/iTowns/itowns/commit/9ee991c))
* **picking:** don't pick atmosphere layer ([069b2dd](https://github.com/iTowns/itowns/commit/069b2dd))


### Examples

* **3dtiles_25d:** change data url ([52a412f](https://github.com/iTowns/itowns/commit/52a412f))
* **Camera animation:** cleanup example code ([2bfe4e6](https://github.com/iTowns/itowns/commit/2bfe4e6))
* **GuiTools:** fix opacity slider by adding step ([3b205bc](https://github.com/iTowns/itowns/commit/3b205bc))
* **DSM:** add an example of Digital Surface Model ([2f9d558](https://github.com/iTowns/itowns/commit/2f9d558))


### Code Refactoring

* **feature:** use feature crs property for instance center property. ([e455bdb](https://github.com/iTowns/itowns/commit/e455bdb))


### Workflow and chores

* release v2.39.0 ([dd1d251](https://github.com/iTowns/itowns/commit/dd1d251))
* add a script to start an https local session with webpack ([e99bf15](https://github.com/iTowns/itowns/commit/e99bf15))
* **deps:** bump loader-utils from 2.0.2 to 2.0.3 ([fd0f01b](https://github.com/iTowns/itowns/commit/fd0f01b))
* **deps:** bump loader-utils from 2.0.3 to 2.0.4 ([cccacae](https://github.com/iTowns/itowns/commit/cccacae))
* **deps:** bump terser from 5.13.1 to 5.14.2 ([7134b26](https://github.com/iTowns/itowns/commit/7134b26))
* **integration:** add option to launch integration workflow manually ([db05ed6](https://github.com/iTowns/itowns/commit/db05ed6))
* **integration:** update potree repository ([39fbdd7](https://github.com/iTowns/itowns/commit/39fbdd7))
* up chalk to 5.0.1 ([1a30d66](https://github.com/iTowns/itowns/commit/1a30d66))
* update CONTRIBUTORS.md ([ba33056](https://github.com/iTowns/itowns/commit/ba33056))
* update packages. ([3dac8b9](https://github.com/iTowns/itowns/commit/3dac8b9))
* update three.js to 0.146.0 ([55e7016](https://github.com/iTowns/itowns/commit/55e7016))


### Documentation

* **RasterTile:** fix faulty link ([7cf4fcf](https://github.com/iTowns/itowns/commit/7cf4fcf))
* **README:** Typo in the readme redirecting to a 404 error ([04122a8](https://github.com/iTowns/itowns/commit/04122a8))
* **tutorials:** Improve tutorial and add two tutorials for 3D tiles ([3063925](https://github.com/iTowns/itowns/commit/3063925))


### Tests

* **3dtiles:** add 3D Tiles batch table parsing tests ([f3bd6c7](https://github.com/iTowns/itowns/commit/f3bd6c7))


### BREAKING CHANGES

* **3dtiles:** `C3DTBatchTable` constructor signature has changed from
C3DTBatchTable(buffer, binaryLength, batchLength, registeredExtensions) to
C3DTBatchTable(buffer, jsonLength, binaryLength, batchLength, registeredExtensions)



<a name="2.38.2"></a>
## [2.38.2](https://github.com/iTowns/itowns/compare/v2.38.1...v2.38.2) (2022-05-11)


### Features

* **View:** Add option viewer to enable/disable focus on start. ([88d7c93](https://github.com/iTowns/itowns/commit/88d7c93))


### Workflow and chores

* release v2.38.2 ([36213cc](https://github.com/iTowns/itowns/commit/36213cc))



<a name="2.38.1"></a>
## [2.38.1](https://github.com/iTowns/itowns/compare/v2.38.0...v2.38.1) (2022-04-13)


### Examples

* **Navigation:** fix addButton method call ([c53ae71](https://github.com/iTowns/itowns/commit/c53ae71))


### Workflow and chores

* release v2.38.1 ([2ea8b0a](https://github.com/iTowns/itowns/commit/2ea8b0a))



<a name="2.38.0"></a>
# [2.38.0](https://github.com/iTowns/itowns/compare/v2.37.0...v2.38.0) (2022-04-13)


### Features

* **FeatureGeometryLayer:** introduce FeatureMesh, they are added to layer.object3d. ([0d777ce](https://github.com/iTowns/itowns/commit/0d777ce))
* **Widgets:** add a searchbar widget ([164b6ee](https://github.com/iTowns/itowns/commit/164b6ee))
* **Widgets:** add a widget to display a scale ([d3a0154](https://github.com/iTowns/itowns/commit/d3a0154))
* **Widgets:** add show and hide methods ([59ac32c](https://github.com/iTowns/itowns/commit/59ac32c))
* **widgets:** Navigation tooltips can be parametrized ([094803f](https://github.com/iTowns/itowns/commit/094803f))
* **Widgets:** placeholder for searchbar can be modified ([9bd81ce](https://github.com/iTowns/itowns/commit/9bd81ce))


### Bug Fixes

* **Feature2Mesh:** fix wrong computing of clockwise polygon. ([bad5e34](https://github.com/iTowns/itowns/commit/bad5e34))
* **GeoidLayer:** transformation error on tileMesh. ([472e39c](https://github.com/iTowns/itowns/commit/472e39c))
* **parser:** GeoJsonParser add legacy identifier to fct readCRS() ([a0195c6](https://github.com/iTowns/itowns/commit/a0195c6))
* **VectorTileParser:** clock wise polygon wasn't calculated. ([135ee7a](https://github.com/iTowns/itowns/commit/135ee7a))
* **View:** fix pickCoordinates undefined parameter ([0ec49f4](https://github.com/iTowns/itowns/commit/0ec49f4))
* **Widgets:** fix focus policy and event propagation on widgets ([7775a04](https://github.com/iTowns/itowns/commit/7775a04))
* **Widgets:** fix in Navigation css ([a85f8b4](https://github.com/iTowns/itowns/commit/a85f8b4))


### Examples

* change view source button style ([e593237](https://github.com/iTowns/itowns/commit/e593237))
* **FeatureGeometryLayer:** add vector tile to 3d object. ([53a42a6](https://github.com/iTowns/itowns/commit/53a42a6))
* **view 3d:** updates on widgets ([30bee5f](https://github.com/iTowns/itowns/commit/30bee5f))
* **Widgets:** use minimap widget in view 3D example ([5042ba7](https://github.com/iTowns/itowns/commit/5042ba7))


### Code Refactoring

* **Feature:** move properties to private fields. ([02604b9](https://github.com/iTowns/itowns/commit/02604b9))
* **Feature:** simplify normals data. ([0914834](https://github.com/iTowns/itowns/commit/0914834))
* **GeometryLayer:** reference to material properties from Layer properties. ([23a0269](https://github.com/iTowns/itowns/commit/23a0269))
* **label:** render only object with labels. ([c317a8a](https://github.com/iTowns/itowns/commit/c317a8a))
* **MainLoop:** use class for MainLoop. ([25a48fd](https://github.com/iTowns/itowns/commit/25a48fd))
* **PlanarControls:** change focus policy ([99fadc0](https://github.com/iTowns/itowns/commit/99fadc0))
* **view_3d_map:** simplify example ([3786dcf](https://github.com/iTowns/itowns/commit/3786dcf))
* **View:** move View properties to private fields. ([51f5508](https://github.com/iTowns/itowns/commit/51f5508))
* **Widgets:** add onClick property in Navigation ([8d9f69e](https://github.com/iTowns/itowns/commit/8d9f69e))
* **Widgets:** simplify Navigation usage ([7c2bc89](https://github.com/iTowns/itowns/commit/7c2bc89))


### Workflow and chores

* release v2.38.0 ([34ae0f3](https://github.com/iTowns/itowns/commit/34ae0f3))
* add support ecma 2022 ([25080d9](https://github.com/iTowns/itowns/commit/25080d9))
* **deps:** bump deps to fix security vulnerability. ([1db1ae7](https://github.com/iTowns/itowns/commit/1db1ae7))
* **deps:** bump minimist from 1.2.5 to 1.2.6 ([09e047a](https://github.com/iTowns/itowns/commit/09e047a))
* **deps:** bump node-forge from 1.2.1 to 1.3.0 ([e536532](https://github.com/iTowns/itowns/commit/e536532))
* **submodule:** use submodule for widgets. ([44cc7d0](https://github.com/iTowns/itowns/commit/44cc7d0))
* update packages. ([e19809f](https://github.com/iTowns/itowns/commit/e19809f))


### Documentation

* **core:** Add doc for local execution ([faf58be](https://github.com/iTowns/itowns/commit/faf58be))
* **Widgets:** specify GlobeView support for navigation ([c209fdc](https://github.com/iTowns/itowns/commit/c209fdc))
* **Widgets:** specify resources needed to use widgets ([b65c081](https://github.com/iTowns/itowns/commit/b65c081))


### Tests

* **Feature2Mesh:** add test to calculate the difference with and without proj4. ([1527c64](https://github.com/iTowns/itowns/commit/1527c64))



<a name="2.37.0"></a>
# [2.37.0](https://github.com/iTowns/itowns/compare/v2.36.2...v2.37.0) (2022-01-31)


### Features

* **Geoid:** add support for geoid heights ([38569f6](https://github.com/iTowns/itowns/commit/38569f6))
* **Parser:** add parsers for GTX, ISG and GDF file formats ([a55b154](https://github.com/iTowns/itowns/commit/a55b154))
* **View:** add a method to pick world coordinates ([91ccfe3](https://github.com/iTowns/itowns/commit/91ccfe3))
* **View:** add support for ortho camera in getScale method ([06eb805](https://github.com/iTowns/itowns/commit/06eb805))
* **View:** dispatch an event when camera is moved ([37cfb90](https://github.com/iTowns/itowns/commit/37cfb90))
* **Widget:** add a minimap widget ([6d82c74](https://github.com/iTowns/itowns/commit/6d82c74))


### Bug Fixes

* **GlobeControl:** stop damping when launching new animation ([dad7641](https://github.com/iTowns/itowns/commit/dad7641))
* **test:** fetch local laz files behind proxy. ([b732c0a](https://github.com/iTowns/itowns/commit/b732c0a))
* **View:** fix picking radius with polygons ([b7be8e9](https://github.com/iTowns/itowns/commit/b7be8e9))


### Examples

* **Compass:** add an example of a compass in a GlobeView ([3290820](https://github.com/iTowns/itowns/commit/3290820))
* **FileSource:** add exemples of FileSource instantiation ([7db9bcb](https://github.com/iTowns/itowns/commit/7db9bcb))
* **Potree:** add an example of Potree intgration within iTowns ([4bbc772](https://github.com/iTowns/itowns/commit/4bbc772))
* **Potree:** fix minor issues on the example ([1ee50c8](https://github.com/iTowns/itowns/commit/1ee50c8))
* **source / file:** simplify FileSource usage ([21317b4](https://github.com/iTowns/itowns/commit/21317b4))
* **Widget:** add an example of minimap widget ([2b89f83](https://github.com/iTowns/itowns/commit/2b89f83))
* **Widgets:** add a plugin to display widgets ([ec56fa9](https://github.com/iTowns/itowns/commit/ec56fa9))
* add GeoidLayer implementation example ([5df8cc5](https://github.com/iTowns/itowns/commit/5df8cc5))


### Code Refactoring

* **TileMesh:** refactorize bbox update method ([18196b6](https://github.com/iTowns/itowns/commit/18196b6))
* **Widgets:** rename widgets to navigation ([509a042](https://github.com/iTowns/itowns/commit/509a042))


### Workflow and chores

* release v2.37.0 ([97e59b6](https://github.com/iTowns/itowns/commit/97e59b6))
* **deps-dev:** bump marked from 4.0.8 to 4.0.10 ([cfc9100](https://github.com/iTowns/itowns/commit/cfc9100))
* add potree repo and symbolic link to gitignore ([d7bb92c](https://github.com/iTowns/itowns/commit/d7bb92c))
* change itowns.github.io deploying ([870299f](https://github.com/iTowns/itowns/commit/870299f))
* deploy itowns and potree bundle. ([b104fd5](https://github.com/iTowns/itowns/commit/b104fd5))
* fix eslint rules. ([6fff078](https://github.com/iTowns/itowns/commit/6fff078))
* update CONTRIBUTING.md ([96cfb21](https://github.com/iTowns/itowns/commit/96cfb21))
* update packages. ([eb7c8d5](https://github.com/iTowns/itowns/commit/eb7c8d5))



<a name="2.36.2"></a>
## [2.36.2](https://github.com/iTowns/itowns/compare/v2.36.1...v2.36.2) (2021-11-29)


### Bug Fixes

* **VectorTileSource:** error if vector tile layer style is undefined. ([b535583](https://github.com/iTowns/itowns/commit/b535583))


### Code Refactoring

* **Coordinates/Extent:** rename dimension and distance methods. ([6a436ac](https://github.com/iTowns/itowns/commit/6a436ac))
* **examples:** replace geoservice keys. ([b81738c](https://github.com/iTowns/itowns/commit/b81738c))
* **Feature:** defaults buildExtent parameter to true for 2d structure ([3182075](https://github.com/iTowns/itowns/commit/3182075))


### Workflow and chores

* release v2.36.2 ([54c2128](https://github.com/iTowns/itowns/commit/54c2128))



<a name="2.36.1"></a>
## [2.36.1](https://github.com/iTowns/itowns/compare/v2.36.0...v2.36.1) (2021-11-22)


### Bug Fixes

* **View:** wrong calculate pick radius with distance/zoom. ([d5efa03](https://github.com/iTowns/itowns/commit/d5efa03))


### Workflow and chores

* release v2.36.1 ([b0cf534](https://github.com/iTowns/itowns/commit/b0cf534))



<a name="2.36.0"></a>
# [2.36.0](https://github.com/iTowns/itowns/compare/v2.35.0...v2.36.0) (2021-11-18)


### Features

* **Coordinates:** add methods to calculate distance between coordinates. ([acdf643](https://github.com/iTowns/itowns/commit/acdf643))
* **Crs:** add isGeocentric method. ([1ab76c8](https://github.com/iTowns/itowns/commit/1ab76c8))
* **Extent:** add methods to calculate extent dimensions. ([ed583d9](https://github.com/iTowns/itowns/commit/ed583d9))
* **Label:** add parameter to change labels padding property ([33f8680](https://github.com/iTowns/itowns/commit/33f8680))


### Bug Fixes

* **ColorLayer:** fix shader when transparent is true ([1a4f44d](https://github.com/iTowns/itowns/commit/1a4f44d))
* **ElevationLayer:** scale elevation isn't updated ([26d72da](https://github.com/iTowns/itowns/commit/26d72da))
* **Ellipsoid:** wrong geodesic distance. ([4d462f2](https://github.com/iTowns/itowns/commit/4d462f2))
* **Extent:** fix wrong calculating when apply matrix. ([04abdd2](https://github.com/iTowns/itowns/commit/04abdd2))
* **Feature:** wrong altitude and altitude limits. ([4746e86](https://github.com/iTowns/itowns/commit/4746e86))
* **Feature2Mesh:** set scale transformation from FeatureCollection. ([0f5cd07](https://github.com/iTowns/itowns/commit/0f5cd07))
* **FirstPersonControls:** prevent context menu from poping ([94bfd57](https://github.com/iTowns/itowns/commit/94bfd57))
* **GlobeControls:** fix black screen when zooming outside globe ([3e0f23f](https://github.com/iTowns/itowns/commit/3e0f23f))
* **label2DRenderer:** add frustum culling in global labels culling. ([5ba4e9d](https://github.com/iTowns/itowns/commit/5ba4e9d))
* **Point/3Dtiles:** wrong geographical extent property for points cloud and 3Dtiles. ([c663ce4](https://github.com/iTowns/itowns/commit/c663ce4))
* **Style:** copy order property when copying style ([cab78ba](https://github.com/iTowns/itowns/commit/cab78ba))
* **VectorTileSource:** set style parent with style Layer ([aba0743](https://github.com/iTowns/itowns/commit/aba0743))


### Examples

* **3dtiles_basic:** update 3dtiles sources url ([50d6733](https://github.com/iTowns/itowns/commit/50d6733))


### Code Refactoring

* **debug:** remove id text in OBB helper. ([d033279](https://github.com/iTowns/itowns/commit/d033279))
* **examples:** add wfs labels in 2.5d examples. ([944e412](https://github.com/iTowns/itowns/commit/944e412))
* **Extent:** throw error if the projection is geocentric. ([e0048f7](https://github.com/iTowns/itowns/commit/e0048f7))
* **Extent:** use Extent.planarDimensions instead of Extent.dimensions ([023d5fa](https://github.com/iTowns/itowns/commit/023d5fa))
* **OBBHelper:** remove OBBHelper text. ([1e2fc31](https://github.com/iTowns/itowns/commit/1e2fc31))
* **TerrainMaterial:** rename fogDepth -> vFogDepth ([7d162ec](https://github.com/iTowns/itowns/commit/7d162ec))
* **View:** change label margin default. ([8c6edf5](https://github.com/iTowns/itowns/commit/8c6edf5))


### Workflow and chores

* release v2.36.0 ([091c59b](https://github.com/iTowns/itowns/commit/091c59b))
* add contributor. ([323b046](https://github.com/iTowns/itowns/commit/323b046))
* update packages. ([ef204f9](https://github.com/iTowns/itowns/commit/ef204f9))


### Documentation

* **Ellipsoid:** minor fix on geodesicDistance doc ([a0cd2a3](https://github.com/iTowns/itowns/commit/a0cd2a3))



<a name="2.35.0"></a>
# [2.35.0](https://github.com/iTowns/itowns/compare/v2.34.0...v2.35.0) (2021-09-16)


### Features

* **AnimationPlayer:** add a callback ran at each animation frame ([1280ce0](https://github.com/iTowns/itowns/commit/1280ce0))


### Bug Fixes

* **c3DEngine:** fix error when input renderer.domElement is a canvas ([14567c1](https://github.com/iTowns/itowns/commit/14567c1))
* **CameraUtils:** CameraTransformOptions parameter stopPlaceOnGroundAtEnd is no longer overriden ([7f3a542](https://github.com/iTowns/itowns/commit/7f3a542))
* **CameraUtils:** compute precise altitude when setting CameraRig ([011fcbc](https://github.com/iTowns/itowns/commit/011fcbc))
* **Feature2Mesh:** addapt indices array type from the size of polygon ([378c092](https://github.com/iTowns/itowns/commit/378c092))
* **GlobeControls:** fix jittering move globe when devtool is open ([825841c](https://github.com/iTowns/itowns/commit/825841c))
* **Label:** clamp labels altitude over 0 ([ddd59e0](https://github.com/iTowns/itowns/commit/ddd59e0))
* **Label:** enforce Labels div top position to 0 ([08528d7](https://github.com/iTowns/itowns/commit/08528d7))
* **ShapefileParser:** prevent ignoring input crs wen given ([d2b90b7](https://github.com/iTowns/itowns/commit/d2b90b7))


### Examples

* **camera traveling:** add an example where user can pick points and have camera traveling between those points ([6e79ff3](https://github.com/iTowns/itowns/commit/6e79ff3))


### Code Refactoring

* **Controls:** change deprecated mouseWheel event to wheel event ([923d10c](https://github.com/iTowns/itowns/commit/923d10c))
* **Controls:** handle mouse events in StateControls ([ae1c30b](https://github.com/iTowns/itowns/commit/ae1c30b))
* **Controls:** switch context menu management in StateControl ([5fa010b](https://github.com/iTowns/itowns/commit/5fa010b))
* **Controls:** switch enabled property from GlobeControls to StateControl ([76130b4](https://github.com/iTowns/itowns/commit/76130b4))
* **Controls:** switch keyboard management to StateControls ([a392a7b](https://github.com/iTowns/itowns/commit/a392a7b))
* **Controls:** switch wheel management to StateControl ([4e64b75](https://github.com/iTowns/itowns/commit/4e64b75))
* **StateControl:** factorise handleMouse in pointer methods ([0e626d8](https://github.com/iTowns/itowns/commit/0e626d8))
* **StateControls:** simplify setFromOptions method ([a7d175f](https://github.com/iTowns/itowns/commit/a7d175f))


### Workflow and chores

* release v2.35.0 ([ade35e8](https://github.com/iTowns/itowns/commit/ade35e8))
* **examples:** change geoportail key. ([36f0f40](https://github.com/iTowns/itowns/commit/36f0f40))
* move babel preset-env options to .babelrc ([ad22bcc](https://github.com/iTowns/itowns/commit/ad22bcc))
* remove import three examples polyfill. ([48d52ae](https://github.com/iTowns/itowns/commit/48d52ae))
* up three 131.2 ([aed4dbc](https://github.com/iTowns/itowns/commit/aed4dbc))
* up to webpack 5. ([ea36982](https://github.com/iTowns/itowns/commit/ea36982))
* update packages. ([909e96e](https://github.com/iTowns/itowns/commit/909e96e))


### Documentation

* minor update on Controls documentation ([5f4ace1](https://github.com/iTowns/itowns/commit/5f4ace1))
* **Controls:** minor doc fixes ([d7c2ffa](https://github.com/iTowns/itowns/commit/d7c2ffa))



<a name="2.34.0"></a>
# [2.34.0](https://github.com/iTowns/itowns/compare/v2.33.0...v2.34.0) (2021-07-30)


### Features

* **GlobeControls:** add support for travel out animation ([9db6ecb](https://github.com/iTowns/itowns/commit/9db6ecb))
* **Label:** add support to pass custom domElements to labels ([b560005](https://github.com/iTowns/itowns/commit/b560005))
* **Layer:** add FeatureGeometryLayer. ([0961787](https://github.com/iTowns/itowns/commit/0961787))
* **StateControl:** add a method to modify class properties ([1e2e11e](https://github.com/iTowns/itowns/commit/1e2e11e))
* **Style:** add support for custom icon in labels ([7f355c4](https://github.com/iTowns/itowns/commit/7f355c4))
* **Style:** add support for custom label anchor ([fe2a2d9](https://github.com/iTowns/itowns/commit/fe2a2d9))
* **TMSSource:** add support for specific TileMatrix identifier ([e394255](https://github.com/iTowns/itowns/commit/e394255))
* **View:** add double right-click event ([9ce7213](https://github.com/iTowns/itowns/commit/9ce7213))


### Bug Fixes

* **3Dtiles:** remove debugger command. ([0a06614](https://github.com/iTowns/itowns/commit/0a06614))
* **eventToViewCoord:** check if event.offset properties are defined ([26f459a](https://github.com/iTowns/itowns/commit/26f459a))
* **example:** generate correct URL when sharing EPT example ([8ef0b34](https://github.com/iTowns/itowns/commit/8ef0b34))
* **FeatureToolTip:** fix tooltip legend icon ([f632308](https://github.com/iTowns/itowns/commit/f632308))
* **Label:** fix occlusion between icons and label text ([29b6435](https://github.com/iTowns/itowns/commit/29b6435))
* **Label:** fix Style.text.offset parameter ([26b970b](https://github.com/iTowns/itowns/commit/26b970b))
* **Label:** rounds the projected coordinates of labels ([5d0ca6f](https://github.com/iTowns/itowns/commit/5d0ca6f))
* **LayeredMaterialNodeProcessing:** checks for source cache with the layer crs for command cancellation ([7570cad](https://github.com/iTowns/itowns/commit/7570cad))
* **tutorial:** fix internal link in tutorials ([ce8029c](https://github.com/iTowns/itowns/commit/ce8029c))


### Examples

* add an example where user can define custom controls ([00e62c2](https://github.com/iTowns/itowns/commit/00e62c2))
* **GeoJSON raster:** center the camera initial position on the displayed features ([8d8ac2c](https://github.com/iTowns/itowns/commit/8d8ac2c))
* **geojson-file:** refactor example to illustrate two ways of displaying data from a file ([4bc0774](https://github.com/iTowns/itowns/commit/4bc0774))
* **vectorTile:** replace expired source in vector tile examples ([8ccc1a3](https://github.com/iTowns/itowns/commit/8ccc1a3))


### Code Refactoring

* **GlobeControls:** switch travel animation to StateControl ([d99827d](https://github.com/iTowns/itowns/commit/d99827d))
* **View:** eventToViewCoords returns middle view coords by default ([2e501c3](https://github.com/iTowns/itowns/commit/2e501c3))


### Workflow and chores

* release v2.34.0 ([4fe8baa](https://github.com/iTowns/itowns/commit/4fe8baa))
* expose 3dtiles process methods. ([7a94570](https://github.com/iTowns/itowns/commit/7a94570))
* update packages. ([50cd744](https://github.com/iTowns/itowns/commit/50cd744))


### Documentation

* **FeatureGeometryLayer:** add jsdoc to documentation config ([e77f102](https://github.com/iTowns/itowns/commit/e77f102))
* **README:** update deprecated link ([b483e0d](https://github.com/iTowns/itowns/commit/b483e0d))
* **README:** update integration badge to github action ([4c77adf](https://github.com/iTowns/itowns/commit/4c77adf))
* **Style:** add precision on doc ([bcee39f](https://github.com/iTowns/itowns/commit/bcee39f))
* **tutorials:** add support to sort tutorials in sections ([e9c8510](https://github.com/iTowns/itowns/commit/e9c8510))


### Others

* **Fundamentals:** add links to documentation ([cf30e37](https://github.com/iTowns/itowns/commit/cf30e37))
* **Fundamentals:** change section titles ([296206f](https://github.com/iTowns/itowns/commit/296206f))
* **Fundamentals:** change tutorial links appearance ([ac167ec](https://github.com/iTowns/itowns/commit/ac167ec))
* add tutorials on how to use iTowns ([5916ac9](https://github.com/iTowns/itowns/commit/5916ac9))
* resize tutorial images ([bbb91e7](https://github.com/iTowns/itowns/commit/bbb91e7))
* update html titles in some examples ([7ea6538](https://github.com/iTowns/itowns/commit/7ea6538))



<a name="2.33.0"></a>
# [2.33.0](https://github.com/iTowns/itowns/compare/v2.32.0...v2.33.0) (2021-05-28)


### Features

* **ColorLayer:** add custom shader to ColorLayer. ([2d32888](https://github.com/iTowns/itowns/commit/2d32888))
* **ColorLayer:** add option to filtering textures Layer. ([da245f9](https://github.com/iTowns/itowns/commit/da245f9))
* **Coordinates:** add applyMatrix4 method. ([061eda0](https://github.com/iTowns/itowns/commit/061eda0))


### Bug Fixes

* **CameraUtils:** count heading in clockwise direction ([880c67d](https://github.com/iTowns/itowns/commit/880c67d))
* **CameraUtils:** fix rotation animation when start heading is 0 ([1ca0c17](https://github.com/iTowns/itowns/commit/1ca0c17))
* **CameraUtils:** the camera rotation animation take the shortest angle ([ae194d3](https://github.com/iTowns/itowns/commit/ae194d3))
* **Controls:** replace deprecated THREE.Quaternion.slerp. ([2e27408](https://github.com/iTowns/itowns/commit/2e27408))
* **debug:** update coordinates event on mouse move ([9b62770](https://github.com/iTowns/itowns/commit/9b62770))
* **Feature:** wrong condition to choose extent crs projection. ([73198c7](https://github.com/iTowns/itowns/commit/73198c7))
* **FeatureToolTip:** avoid undefined layer on move. ([6ae7305](https://github.com/iTowns/itowns/commit/6ae7305))
* **FileSource:** transform extent source if is needed. ([0177503](https://github.com/iTowns/itowns/commit/0177503))
* **GeojsonParser:** store geojson properties within a separate property ([121b796](https://github.com/iTowns/itowns/commit/121b796))
* **LabelLayer:** init LabelLayer visibility with attached ColorLayer. ([67f25a1](https://github.com/iTowns/itowns/commit/67f25a1))
* **LayeredMaterialNodeProcessing:** prevent errors in layer update when removing layer ([d9fda75](https://github.com/iTowns/itowns/commit/d9fda75))
* **PlanarControls:** prevent freezing zoom when clicking while zooming with an orthographic camera ([b0f0a2d](https://github.com/iTowns/itowns/commit/b0f0a2d))
* **test:** use Extent.applyMatrix4 and Coordinates.applyMatrix4. ([bdf50ab](https://github.com/iTowns/itowns/commit/bdf50ab))


### Examples

* add custom shader effect example. ([15163d9](https://github.com/iTowns/itowns/commit/15163d9))
* change buildings id for coloring ([3f7ccd0](https://github.com/iTowns/itowns/commit/3f7ccd0))


### Code Refactoring

* **ColorLayer:** add effect type ColorLayer parameter. ([19d58c6](https://github.com/iTowns/itowns/commit/19d58c6))
* **ColorLayer:** remove useless features in ColorLayer command. ([66ee340](https://github.com/iTowns/itowns/commit/66ee340))
* **example:** remove unuseless variable. ([041b62a](https://github.com/iTowns/itowns/commit/041b62a))
* **Feature:** compute and apply local transform matrix in Feature. ([e244f55](https://github.com/iTowns/itowns/commit/e244f55))
* **Feature:** declare constant in file begining. ([f44c29e](https://github.com/iTowns/itowns/commit/f44c29e))
* **Feature:** FeatureCollection extends by Object3D and use local transform matrix. ([8d20315](https://github.com/iTowns/itowns/commit/8d20315))
* **Feature:** normalize crs projection. ([f9df7ff](https://github.com/iTowns/itowns/commit/f9df7ff))
* **Feature:** remove optionsFeature from FeatureCollection. ([b15c642](https://github.com/iTowns/itowns/commit/b15c642))
* **Feature:** replace parsing option withNormal and withAltitude by structure. ([420ba1a](https://github.com/iTowns/itowns/commit/420ba1a))
* **Feature:** simplify build extent check. ([0091a5a](https://github.com/iTowns/itowns/commit/0091a5a))
* **Layer:** deprecate labelEnable option Layer and replace by addLabelLayer. ([082d22c](https://github.com/iTowns/itowns/commit/082d22c))
* **ShaderChunk:** introduce shader chunk manager class to instance ShaderChunk. ([e93ed76](https://github.com/iTowns/itowns/commit/e93ed76))
* **Source:** avoid to cache raster data in Source. ([521ca74](https://github.com/iTowns/itowns/commit/521ca74))
* **Style/Convert:** move options from Converter to Style. ([23de259](https://github.com/iTowns/itowns/commit/23de259))
* **VectorTileParser:** remove unnecessary parameters. ([860d748](https://github.com/iTowns/itowns/commit/860d748))


### Workflow and chores

* release v2.33.0 ([b1cb970](https://github.com/iTowns/itowns/commit/b1cb970))
* **chart.js:** update chart.js to 3.0. ([6953e01](https://github.com/iTowns/itowns/commit/6953e01))
* update packages. ([0f54e2e](https://github.com/iTowns/itowns/commit/0f54e2e))


### Documentation

* **FeatureCollection:** clarify FeatureCollection.extent projection. ([f612eb3](https://github.com/iTowns/itowns/commit/f612eb3))
* **View:** add diffuse parameter documentation. ([fcc16da](https://github.com/iTowns/itowns/commit/fcc16da))


### Tests

* **unit:** update unit tests with feature refactoring. ([cbe3e68](https://github.com/iTowns/itowns/commit/cbe3e68))


### BREAKING CHANGES

* **Style/Convert:** * `GeometryLayer.convert` options are moved in Style properties. Use
  * `Style.xxx.color`
  * `Style.xxx.base_altitude`
  * `Style.fill.extrusion_height`
  * `Style.stroke.width`
  * `Style.point.radius`
* `overrideAltitudeInToZero` layer options is removed use `Style.xxx.base_altitude` instead.
* **CameraUtils:** The headings used in CameraUtils are now counted clockwise (they were
previously counted counter-clockwise).
* **Feature:** FeatureCollection and Feature signature constructor are changed.



<a name="2.32.0"></a>
# [2.32.0](https://github.com/iTowns/itowns/compare/v2.31.0...v2.32.0) (2021-04-09)


### Features

* **PlanarControls:** add max and min resolution parameters to limit zoom ([ad17590](https://github.com/iTowns/itowns/commit/ad17590))
* **PlanarControls:** Add property 'Cursor' and method 'setCursor' for cursor modification ([0870ede](https://github.com/iTowns/itowns/commit/0870ede))
* **Style:** support mapbox expression. ([0581d3d](https://github.com/iTowns/itowns/commit/0581d3d))


### Bug Fixes

* **Atmosphere:** avoid several realistic atmosphere initializations. ([b949f75](https://github.com/iTowns/itowns/commit/b949f75))
* **Camera:** resize preserves the scale ([e44de7f](https://github.com/iTowns/itowns/commit/e44de7f))
* **extent:** forget copy zoom in Extent#transformedCopy. ([1a607ea](https://github.com/iTowns/itowns/commit/1a607ea))
* **Extent:** forgetting zoom property copy, in Extent.as(). ([3efea0e](https://github.com/iTowns/itowns/commit/3efea0e))
* **Label:** wrong div translate. ([5ef7197](https://github.com/iTowns/itowns/commit/5ef7197))
* **PlanarControls:** fix drag when moving out of view domElement ([a4f0a3f](https://github.com/iTowns/itowns/commit/a4f0a3f))
* **PlanarControls:** prevent triggering new movement when already moving ([66256bb](https://github.com/iTowns/itowns/commit/66256bb))
* **test:** apply async icon label loading. ([76d732a](https://github.com/iTowns/itowns/commit/76d732a))
* **test:** update label test with default icon size. ([72a98d4](https://github.com/iTowns/itowns/commit/72a98d4))
* **test:** update vector tile style test with context expression. ([c9fc662](https://github.com/iTowns/itowns/commit/c9fc662))
* **VectorTileSource:** failing to open mapbox url format. ([b6dd383](https://github.com/iTowns/itowns/commit/b6dd383))


### Examples

* **Orthographic:** add resolution limit parameters in orthographic examples ([aafd37b](https://github.com/iTowns/itowns/commit/aafd37b))
* add atmosphere mars example. ([27e28ad](https://github.com/iTowns/itowns/commit/27e28ad))
* update irrelevant titles in some examples ([2914286](https://github.com/iTowns/itowns/commit/2914286))


### Code Refactoring

* **Atmosphere:** move realistic atmosphere options to Atmosphere constructor. ([234a8ee](https://github.com/iTowns/itowns/commit/234a8ee))
* **Source:** remove extentsInsideLimit. ([035701b](https://github.com/iTowns/itowns/commit/035701b))
* **VectorTilesSource:** remove useless styles by zoom. ([baabbae](https://github.com/iTowns/itowns/commit/baabbae))


### Workflow and chores

* release v2.32.0 ([95c6f37](https://github.com/iTowns/itowns/commit/95c6f37))
* update packages. ([e9ae835](https://github.com/iTowns/itowns/commit/e9ae835))


### Documentation

* **GeometryLayer:** fix example and typo regarding Object3D ([d77c8d6](https://github.com/iTowns/itowns/commit/d77c8d6))
* **TMSSource:** add example in doc ([dce0032](https://github.com/iTowns/itowns/commit/dce0032))



<a name="2.31.0"></a>
# [2.31.0](https://github.com/iTowns/itowns/compare/v2.30.0...v2.31.0) (2021-03-02)


### Bug Fixes

* **GlobeLayer:** doesn't subdivise the pole tile mesh. ([53a9f6f](https://github.com/iTowns/itowns/commit/53a9f6f))
* **PlanarControls:** fix pan movement ([5be30b7](https://github.com/iTowns/itowns/commit/5be30b7))
* **PlanarControls:** standardize zoom factors for perspective and orthographic camera ([c65bbab](https://github.com/iTowns/itowns/commit/c65bbab))
* **Points:** remove THREE.Geometry. ([6ff3b3d](https://github.com/iTowns/itowns/commit/6ff3b3d))
* **RasterColorTile:** wrong getter name. ([1f7eb05](https://github.com/iTowns/itowns/commit/1f7eb05))


### Examples

* correct zoom factor parameter in examples ([a86e3f8](https://github.com/iTowns/itowns/commit/a86e3f8))


### Code Refactoring

* **Debug:** simplified point debug code. ([c99fb09](https://github.com/iTowns/itowns/commit/c99fb09))
* **GlobeControls:** refactor zoom speed management ([57f6666](https://github.com/iTowns/itowns/commit/57f6666))
* **Immersive:** replace Matrix4.makeBasisFromMatrix by Matrix4.setFromMatrix3. ([d442602](https://github.com/iTowns/itowns/commit/d442602))
* **MaterialLayer:** MaterialLayer to RasterNode. ([46b19f1](https://github.com/iTowns/itowns/commit/46b19f1))
* **PlanarControls:** refactor zoom speed management ([ca47389](https://github.com/iTowns/itowns/commit/ca47389))
* **points:** avoid clone point material. ([174a60f](https://github.com/iTowns/itowns/commit/174a60f))
* **RasterTile:** rename file. ([c73fc38](https://github.com/iTowns/itowns/commit/c73fc38))
* **View:** remove useless getParentLayer method ([6f0b545](https://github.com/iTowns/itowns/commit/6f0b545))
* **View:** simplify getLayerById method. ([58874ec](https://github.com/iTowns/itowns/commit/58874ec))


### Workflow and chores

* release v2.31.0 ([c3f5e47](https://github.com/iTowns/itowns/commit/c3f5e47))
* update package-lock.json. ([b3e81fc](https://github.com/iTowns/itowns/commit/b3e81fc))
* **deps-dev:** bump marked from 1.2.9 to 2.0.0 ([46bc3f9](https://github.com/iTowns/itowns/commit/46bc3f9))
* update packages. ([09f12c9](https://github.com/iTowns/itowns/commit/09f12c9))


### Tests

* **MaterialLayer:** update tests with the MaterialLayer refactoring. ([0fa3c06](https://github.com/iTowns/itowns/commit/0fa3c06))



<a name="2.30.0"></a>
# [2.30.0](https://github.com/iTowns/itowns/compare/v2.29.2...v2.30.0) (2021-02-05)


### Features

* **CameraUtils:** add possibility to set camera placement from an extent ([d6b2ab4](https://github.com/iTowns/itowns/commit/d6b2ab4))
* **VectorTilesSource:** store parsed vector tile style as class property ([bb581fb](https://github.com/iTowns/itowns/commit/bb581fb))


### Bug Fixes

* **Camera:** rename intersectSphere to intersectsSphere ([f5e1004](https://github.com/iTowns/itowns/commit/f5e1004))
* **examples:** rename smartZoom param in vector_tile_raster_2d ([ca7aaeb](https://github.com/iTowns/itowns/commit/ca7aaeb))
* **examples:** update three version in view_mutli_25d ([7778a4d](https://github.com/iTowns/itowns/commit/7778a4d))
* **Terrain:** use exact method to compute min and max elevation node; ([6297c09](https://github.com/iTowns/itowns/commit/6297c09))


### Examples

* **OrthographicCamera:** set camera initial position from an extent ([6c10ba2](https://github.com/iTowns/itowns/commit/6c10ba2))


### Code Refactoring

* **Camera:** refactor Camera as an ES6 class ([596cee6](https://github.com/iTowns/itowns/commit/596cee6))
* **Camera:** remove matrixProjectionNeedsUpdate. ([a501c92](https://github.com/iTowns/itowns/commit/a501c92))
* **debug:** remove three r124 warning. ([9c2406f](https://github.com/iTowns/itowns/commit/9c2406f))
* **layer:** introduce RasterLayer. ([e7b2653](https://github.com/iTowns/itowns/commit/e7b2653))
* **Layer:** Layer constructor parameter needs Source. ([11b8645](https://github.com/iTowns/itowns/commit/11b8645))


### Workflow and chores

* release v2.30.0 ([e69e170](https://github.com/iTowns/itowns/commit/e69e170))
* update packages. ([a5d2cad](https://github.com/iTowns/itowns/commit/a5d2cad))



<a name="2.29.2"></a>
## [2.29.2](https://github.com/iTowns/itowns/compare/v2.29.1...v2.29.2) (2021-01-26)


### Bug Fixes

* **3dTile:** don't overload the b3dm material. ([d7f14b6](https://github.com/iTowns/itowns/commit/d7f14b6))
* **PlanarControls:** fix zoom movement with an orthographic camera ([999851a](https://github.com/iTowns/itowns/commit/999851a))


### Code Refactoring

* **view:** add vector target viewToNormalizedCoords. ([b83a9c8](https://github.com/iTowns/itowns/commit/b83a9c8))


### Workflow and chores

* release v2.29.2 ([62365ea](https://github.com/iTowns/itowns/commit/62365ea))



<a name="2.29.1"></a>
## [2.29.1](https://github.com/iTowns/itowns/compare/v2.29.0...v2.29.1) (2021-01-22)


### Bug Fixes

* **PlanarControls:** fix issues related to cameraOrtho feature ([475c788](https://github.com/iTowns/itowns/commit/475c788))


### Workflow and chores

* release v2.29.1 ([3c71abc](https://github.com/iTowns/itowns/commit/3c71abc))


### Documentation

* update some deprecated doc ([d16c796](https://github.com/iTowns/itowns/commit/d16c796))
* **Camera:** modify camera.adjustAltitudeToAvoidCollisionWithLayer doc ([aabe814](https://github.com/iTowns/itowns/commit/aabe814))
* **GlobeControl:** update class constructor doc ([6fb3d28](https://github.com/iTowns/itowns/commit/6fb3d28))
* **GlobeControls:** minor correction ([7230b53](https://github.com/iTowns/itowns/commit/7230b53))
* **View:** update doc of View.getMeterToPixel method ([cc2385c](https://github.com/iTowns/itowns/commit/cc2385c))



<a name="2.29.0"></a>
# [2.29.0](https://github.com/iTowns/itowns/compare/v2.28.1...v2.29.0) (2021-01-21)


### Features

* **controls:** add damping factor property. ([22d962d](https://github.com/iTowns/itowns/commit/22d962d))
* **controls:** add option enable smart travel in planarControls ([a31873d](https://github.com/iTowns/itowns/commit/a31873d))
* **orthographic camera:** add support for an orthographic camera ([de0dba6](https://github.com/iTowns/itowns/commit/de0dba6))
* **points:** apply opacity classification on others MODE. ([e411425](https://github.com/iTowns/itowns/commit/e411425))
* **webgl:** support pick position from depth buffer with ortho ([05fb79f](https://github.com/iTowns/itowns/commit/05fb79f))


### Bug Fixes

* **ColorLayer:** wrong white to opacity effect. ([9666822](https://github.com/iTowns/itowns/commit/9666822))
* **controls:** moving camera after disabling collision. ([2dd8e06](https://github.com/iTowns/itowns/commit/2dd8e06))
* **controls:** remove prevent default in mouseDown. ([c866807](https://github.com/iTowns/itowns/commit/c866807))
* **examples:** fix key events in examples ([c187616](https://github.com/iTowns/itowns/commit/c187616))
* **PlanarControls:** remove previously instantiated controls associated ([2726101](https://github.com/iTowns/itowns/commit/2726101))
* **PlanarControls:** reset focus policy default parameters ([b56aaaf](https://github.com/iTowns/itowns/commit/b56aaaf))
* **test:** update a deprecated method call ([497d55e](https://github.com/iTowns/itowns/commit/497d55e))
* **workflow:** wrong path to build docs link. ([066f54a](https://github.com/iTowns/itowns/commit/066f54a))


### Examples

* **orthographic camera:** add examples of PlanarView with an orthographic camera ([d58c1b6](https://github.com/iTowns/itowns/commit/d58c1b6))


### Code Refactoring

* **Three:** remove deprecated matrix method. ([fffef40](https://github.com/iTowns/itowns/commit/fffef40))
* **Three:** remove deprecated quaternion method. ([f435fef](https://github.com/iTowns/itowns/commit/f435fef))


### Workflow and chores

* release v2.29.0 ([8c69ef6](https://github.com/iTowns/itowns/commit/8c69ef6))
* add action github to release and npm publish. ([eef3d53](https://github.com/iTowns/itowns/commit/eef3d53))
* add bump script. ([9e0f7b6](https://github.com/iTowns/itowns/commit/9e0f7b6))
* add changelog script. ([f7f6c40](https://github.com/iTowns/itowns/commit/f7f6c40))
* add github action to continuous integration ([e8e4f01](https://github.com/iTowns/itowns/commit/e8e4f01))
* add script to unit tests coverage. ([7c128ab](https://github.com/iTowns/itowns/commit/7c128ab))
* prepare migrating to webpack 5. ([9a549d4](https://github.com/iTowns/itowns/commit/9a549d4))
* refactoring debug npm script. ([b56f8b0](https://github.com/iTowns/itowns/commit/b56f8b0))
* **example:** rename start zoom to smart travel in key bindings description ([24c7c2b](https://github.com/iTowns/itowns/commit/24c7c2b))
* remove deprecated babel-polyfill ([2e3de03](https://github.com/iTowns/itowns/commit/2e3de03))
* remove useless integration files. ([349e1b4](https://github.com/iTowns/itowns/commit/349e1b4))
* update actions/setup-node to v2. ([e3e31c0](https://github.com/iTowns/itowns/commit/e3e31c0))
* upgrade and update lock file version to 2.0. ([537345b](https://github.com/iTowns/itowns/commit/537345b))
* **deps:** bump ini from 1.3.5 to 1.3.7 ([fd46fd1](https://github.com/iTowns/itowns/commit/fd46fd1))
* update packages. ([34ee221](https://github.com/iTowns/itowns/commit/34ee221))


### Documentation

* **workflow:** bump and changelog scripts. ([01bf159](https://github.com/iTowns/itowns/commit/01bf159))


### Others

* Update LICENSE.md ([28be05c](https://github.com/iTowns/itowns/commit/28be05c))
* Change comment on workflow remove old artifact ([7fcbb3a](https://github.com/iTowns/itowns/commit/7fcbb3a))
* Update actions checkout to v2 ([9094edc](https://github.com/iTowns/itowns/commit/9094edc))
* Update remove-old-artifacts.yml ([0a9911f](https://github.com/iTowns/itowns/commit/0a9911f))
* Create remove-old-artifacts.yml ([617326c](https://github.com/iTowns/itowns/commit/617326c))
