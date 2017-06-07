// Modules using `default` export must be imported...
import * as THREE from 'three';
import proj4 from 'proj4';
import { CONTROL_EVENTS } from './Renderer/ThreeExtended/GlobeControls';
import View from './Core/View';
import GlobeView, { GLOBE_VIEW_EVENTS } from './Core/Prefab/GlobeView';
import PlanarView from './Core/Prefab/PlanarView';
import Extent from './Core/Geographic/Extent';
import Coordinates from './Core/Geographic/Coordinates';
import Fetcher from './Core/Scheduler/Providers/Fetcher';

// Then exported as non-default here.
export { GLOBE_VIEW_EVENTS, CONTROL_EVENTS };
export { ColorLayersOrdering } from './Renderer/ColorLayersOrdering';
export { View };
export { GlobeView };
export { PlanarView };
export { Extent };
export { Coordinates };
export { Fetcher };

// Others can be directly exported
export { UNIT } from './Core/Geographic/Coordinates';
export { processTiledGeometryNode, initTiledGeometryLayer } from './Process/TiledNodeProcessing';
export { updateLayeredMaterialNodeImagery, updateLayeredMaterialNodeElevation } from './Process/LayeredMaterialNodeProcessing';
export { GeometryLayer, ImageryLayers } from './Core/Layer/Layer';
export { process3dTilesNode, init3dTilesLayer, $3dTilesCulling, $3dTilesSubdivisionControl, pre3dTilesUpdate } from './Process/3dTilesProcessing';

// This is temporary, until we're able to build a vendor.js
// containing our dependencies.
export { THREE };
export { proj4 };
