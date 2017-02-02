// Modules using `default` export must be imported...
import * as THREE from 'three';
import proj4 from 'proj4';
import ApiGlobe from './Core/Scheduler/Interfaces/ApiInterface/ApiGlobe';
import GlobeView from './Core/Prefab/GlobeView';
import BoundingBox from './Core/Math/BoundingBox';
import Coordinates from './Core/Geographic/Coordinates';

// Then exported as non-default here.
export { ApiGlobe };
export { GlobeView };
export { BoundingBox };
export { Coordinates };

// Others can be directly exported
export { UNIT } from './Core/Geographic/Coordinates';
export { processTiledGeometryNode, initTiledGeometryLayer } from './Process/TiledNodeProcessing';
export { updateLayeredMaterialNodeImagery, updateLayeredMaterialNodeElevation } from './Process/LayeredMaterialNodeProcessing';

// This is temporary, until we're able to build a vendor.js
// containing our dependencies.
export { THREE };
export { proj4 };

