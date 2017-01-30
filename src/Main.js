/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

import ApiGlobe from 'Core/Commander/Interfaces/ApiInterface/ApiGlobe';
import Scene from 'Scene/Scene';
import GeoCoordinate, { UNIT } from 'Core/Geographic/GeoCoordinate';
import BoundingBox from 'Scene/BoundingBox';
import PlanarTileBuilder from 'Plane/PlanarTileBuilder';
import { planeCulling, planeSubdivisionControl, planeSchemeTile } from 'Process/PlaneTileProcessing';
import updateTreeLayer from 'Process/TreeLayerProcessing';
import { processTiledGeometryNode, initTiledGeometryLayer } from 'Process/TiledNodeProcessing';
import { updateLayeredMaterialNodeImagery, updateLayeredMaterialNodeElevation, initNewNode } from 'Process/LayeredMaterialNodeProcessing';
import TileMesh from 'Globe/TileMesh';
import PlanarCameraControls from 'Renderer/ThreeExtended/PlanarCameraControls';
import Ellipsoid from 'Core/Math/Ellipsoid';
import { mobileMappingUpdate, mobileMappingPreUpdate } from 'Process/MobileMappingProcessing';
import PanoramaControls from 'Renderer/ThreeExtended/PanoramaControls';
import BasicMaterial from 'Renderer/BasicMaterial';
import * as THREE from 'three';
import ProjectiveTexturingMaterial from 'Renderer/ProjectiveTexturingMaterial';

// browser execution or not ?
const scope = typeof window !== 'undefined' ? window : {};
const itowns = scope.itowns || {
    viewer: new ApiGlobe(),
    processing: {
        plane: {
            culling: planeCulling,
            subdivisionControl: planeSubdivisionControl,
            schemeTile: planeSchemeTile,
        },
        tree: {
            update: updateTreeLayer,
        },
        tile: {
            update: processTiledGeometryNode,
            init: initTiledGeometryLayer,
        },
        layeredMaterial: {
            init: initNewNode,
            update_imagery: updateLayeredMaterialNodeImagery,
            update_elevation: updateLayeredMaterialNodeElevation,
        },
        mobileMapping: {
            pre_update: mobileMappingPreUpdate,
            update: mobileMappingUpdate,
        }
    },
    builder: {
        planar: PlanarTileBuilder,
    },
    controls: {
        planar: PlanarCameraControls,
        panorama: PanoramaControls,
    },
    THREE,
    BasicMaterial,
    ProjectiveTexturingMaterial,
    GeoCoordinate,
};
scope.itowns = itowns;
export const viewer = itowns.viewer;
export const processing = itowns.processing;
export const builder = itowns.builder;
export const controls = itowns.controls;
export { Scene };
export { UNIT };
export { BoundingBox };
export { TileMesh };
export { Ellipsoid };
export { THREE };
export { BasicMaterial };
export { ProjectiveTexturingMaterial };
export { GeoCoordinate };
export default scope.itowns;
