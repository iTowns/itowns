import * as THREE from 'three';

// This is temporary, until we're able to build a vendor.js
// containing our dependencies.
export { THREE };
export { default as proj4 } from 'proj4';

export { default as Coordinates, UNIT } from './Core/Geographic/Coordinates';
export { default as Extent } from './Core/Geographic/Extent';
export { GeometryLayer, ImageryLayers } from './Core/Layer/Layer';
export { STRATEGY_MIN_NETWORK_TRAFFIC, STRATEGY_GROUP, STRATEGY_PROGRESSIVE, STRATEGY_DICHOTOMY } from './Core/Layer/LayerUpdateStrategy';
export { default as GlobeView, GLOBE_VIEW_EVENTS, createGlobeLayer } from './Core/Prefab/GlobeView';
export { default as GpxUtils } from './Core/Scheduler/Providers/GpxUtils';
export { default as PlanarView, createPlanarLayer } from './Core/Prefab/PlanarView';
export { default as Fetcher } from './Core/Scheduler/Providers/Fetcher';
export { default as View } from './Core/View';
export { process3dTilesNode, init3dTilesLayer, $3dTilesCulling, $3dTilesSubdivisionControl, pre3dTilesUpdate } from './Process/3dTilesProcessing';
export { default as FeatureProcessing } from './Process/FeatureProcessing';
export { updateLayeredMaterialNodeImagery, updateLayeredMaterialNodeElevation } from './Process/LayeredMaterialNodeProcessing';
export { processTiledGeometryNode, initTiledGeometryLayer } from './Process/TiledNodeProcessing';
export { ColorLayersOrdering } from './Renderer/ColorLayersOrdering';
export { default as PointsMaterial } from './Renderer/PointsMaterial';
export { default as PointCloudProcessing } from './Process/PointCloudProcessing';
export { default as FlyControls } from './Renderer/ThreeExtended/FlyControls';
export { default as FirstPersonControls } from './Renderer/ThreeExtended/FirstPersonControls';
export { default as PlanarControls } from './Renderer/ThreeExtended/PlanarControls';
export { default as GeoJSON2Three } from './Renderer/ThreeExtended/GeoJSON2Three';
export { CONTROL_EVENTS } from './Renderer/ThreeExtended/GlobeControls';
export { default as DEMUtils } from './utils/DEMUtils';
