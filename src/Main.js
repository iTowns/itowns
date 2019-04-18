// Geographic tools
export { default as Extent } from 'Core/Geographic/Extent';
export { default as Coordinates } from 'Core/Geographic/Coordinates';
export { default as CRS } from 'Core/Geographic/Crs';

export { default as Ellipsoid, ellipsoidSizes } from 'Core/Math/Ellipsoid';
export { default as GlobeView, GLOBE_VIEW_EVENTS, createGlobeLayer } from 'Core/Prefab/GlobeView';
export { default as PlanarView, createPlanarLayer } from 'Core/Prefab/PlanarView';
export { default as Fetcher } from 'Provider/Fetcher';
export { MAIN_LOOP_EVENTS } from 'Core/MainLoop';
export { default as View } from 'Core/View';
export { VIEW_EVENTS } from 'Core/View';
export { FEATURE_TYPES } from 'Core/Feature';
export { process3dTilesNode, init3dTilesLayer, $3dTilesCulling, $3dTilesSubdivisionControl, pre3dTilesUpdate } from 'Process/3dTilesProcessing';
export { $3dTilesExtensions, $3dTilesAbstractExtension } from 'Provider/3dTilesProvider';
export { default as FeatureProcessing } from 'Process/FeatureProcessing';
export { updateLayeredMaterialNodeImagery, updateLayeredMaterialNodeElevation } from 'Process/LayeredMaterialNodeProcessing';
export { default as OrientedImageCamera } from 'Renderer/OrientedImageCamera';
export { default as PointsMaterial } from 'Renderer/PointsMaterial';
export { default as PointCloudProcessing } from 'Process/PointCloudProcessing';
export { default as FlyControls } from 'Controls/FlyControls';
export { default as FirstPersonControls } from 'Controls/FirstPersonControls';
export { default as StreetControls } from 'Controls/StreetControls';
export { default as PlanarControls } from 'Controls/PlanarControls';
export { CONTROL_EVENTS } from 'Controls/GlobeControls';
export { default as Feature2Mesh } from 'Converter/Feature2Mesh';
export { default as FeaturesUtils } from 'Utils/FeaturesUtils';
export { default as DEMUtils } from 'Utils/DEMUtils';
export { default as CameraUtils } from 'Utils/CameraUtils';
export { default as OrientationUtils } from 'Utils/OrientationUtils';
export { default as ShaderChunk } from 'Renderer/Shader/ShaderChunk';
export { getMaxColorSamplerUnitsCount } from 'Renderer/LayeredMaterial';

// Layers provided by default in iTowns
// A custom layer should at least implements Layer
// See http://www.itowns-project.org/itowns/API_Doc/Layer.html
export { default as Layer, ImageryLayers } from 'Layer/Layer';
export { default as ColorLayer } from 'Layer/ColorLayer';
export { default as ElevationLayer } from 'Layer/ElevationLayer';
export { default as GeometryLayer } from 'Layer/GeometryLayer';
export { default as TiledGeometryLayer } from 'Layer/TiledGeometryLayer';
export { default as OrientedImageLayer } from 'Layer/OrientedImageLayer';
export { STRATEGY_MIN_NETWORK_TRAFFIC, STRATEGY_GROUP, STRATEGY_PROGRESSIVE, STRATEGY_DICHOTOMY } from 'Layer/LayerUpdateStrategy';
export { default as ColorLayersOrdering } from 'Renderer/ColorLayersOrdering';
export { default as GlobeLayer } from 'Core/Prefab/Globe/GlobeLayer';
export { default as PlanarLayer } from 'Core/Prefab/Planar/PlanarLayer';

// Sources provided by default in iTowns
// A custom source should at least implements Source
// See http://www.itowns-project.org/itowns/API_Doc/Source.html
export { default as Source } from 'Source/Source';
export { default as FileSource } from 'Source/FileSource';
export { default as TMSSource } from 'Source/TMSSource';
export { default as WFSSource } from 'Source/WFSSource';
export { default as WMSSource } from 'Source/WMSSource';
export { default as WMTSSource } from 'Source/WMTSSource';
export { default as OrientedImageSource } from 'Source/OrientedImageSource';

// Parsers provided by default in iTowns
// Custom parser can be implemented as wanted, as long as the main function
// takes the data as the first argument and options as the second.
export { default as GpxParser } from 'Parser/GpxParser';
export { default as GeoJsonParser } from 'Parser/GeoJsonParser';
export { default as KMLParser } from 'Parser/KMLParser';
export { default as CameraCalibrationParser } from 'Parser/CameraCalibrationParser';
export { default as BatchTableHierarchyExtensionParser } from 'Parser/BatchTableHierarchyExtensionParser';
export { default as ShapefileParser } from 'Parser/ShapefileParser';
export { enableDracoLoader, glTFLoader, legacyGLTFLoader } from 'Parser/B3dmParser';
