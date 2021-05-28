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



