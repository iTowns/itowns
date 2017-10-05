/**
 * Generated On: 2015-10-5
 * Class: TileMesh
 * Description: Tuile de maillage, noeud du quadtree MNT. Le Materiel est issus du QuadTree ORTHO.
 */

import * as THREE from 'three';
import LayeredMaterial, { l_ELEVATION } from '../Renderer/LayeredMaterial';
import RendererConstant from '../Renderer/RendererConstant';
import OGCWebServiceHelper, { SIZE_TEXTURE_TILE } from './Scheduler/Providers/OGCWebServiceHelper';

function TileMesh(geometry, params) {
    // Constructor
    THREE.Mesh.call(this);

    this.matrixAutoUpdate = false;
    this.rotationAutoUpdate = false;

    if (!params.extent) {
        throw new Error('params.extent is mandatory to build a TileMesh');
    }

    this.level = params.level;
    this.extent = params.extent;

    this.geometry = geometry;
    this.normal = params.center.clone().normalize();

    this.boundingSphereOffset = new THREE.Vector3();

    this.oSphere = new THREE.Sphere(this.geometry.boundingSphere.center.clone(), this.geometry.boundingSphere.radius);

    this.material = new LayeredMaterial(params.materialOptions);

    this.frustumCulled = false;

    this.updateGeometricError();

    // Layer
    this.setDisplayed(false);

    this.layerUpdateState = {};

    this.material.setUuid(this.id);
}

TileMesh.prototype = Object.create(THREE.Mesh.prototype);
TileMesh.prototype.constructor = TileMesh;

TileMesh.prototype.updateMatrixWorld = function updateMatrixWorld(force) {
    THREE.Mesh.prototype.updateMatrixWorld.call(this, force);
    this.geometry.OBB.update();
};

TileMesh.prototype.isVisible = function isVisible() {
    return this.visible;
};

TileMesh.prototype.setDisplayed = function setDisplayed(show) {
    this.material.visible = show;
};

TileMesh.prototype.setVisibility = function setVisibility(show) {
    this.visible = show;
};

TileMesh.prototype.isDisplayed = function isDisplayed() {
    return this.material.visible;
};

// switch material in function of state
TileMesh.prototype.changeState = function changeState(state) {
    if (state == RendererConstant.DEPTH) {
        this.material.defines.DEPTH_MODE = 1;
        delete this.material.defines.MATTE_ID_MODE;
    } else if (state == RendererConstant.ID) {
        this.material.defines.MATTE_ID_MODE = 1;
        delete this.material.defines.DEPTH_MODE;
    } else {
        delete this.material.defines.MATTE_ID_MODE;
        delete this.material.defines.DEPTH_MODE;
    }

    this.material.needsUpdate = true;
};

TileMesh.prototype.setFog = function setFog(fog) {
    this.material.setFogDistance(fog);
};

TileMesh.prototype.setSelected = function setSelected(select) {
    this.material.setSelected(select);
};

TileMesh.prototype.setTextureElevation = function setTextureElevation(elevation) {
    if (this.material === null) {
        return;
    }

    const offsetScale = elevation.pitch || new THREE.Vector3(0, 0, 1);
    this.setBBoxZ(elevation.min, elevation.max);

    this.material.setTexture(elevation.texture, l_ELEVATION, 0, offsetScale);
};


TileMesh.prototype.setBBoxZ = function setBBoxZ(min, max) {
    if (min == undefined && max == undefined) {
        return;
    }
    if (Math.floor(min) !== Math.floor(this.geometry.OBB.z.min) || Math.floor(max) !== Math.floor(this.geometry.OBB.z.max)) {
        const delta = this.geometry.OBB.updateZ(min, max);
        const trans = this.normal.clone().setLength(delta.y);

        this.geometry.boundingSphere.radius = Math.sqrt(delta.x * delta.x + this.oSphere.radius * this.oSphere.radius);
        this.updateGeometricError();
        this.boundingSphereOffset = trans;
    }
};

TileMesh.prototype.updateGeometricError = function updateGeometricError() {
    // The geometric error is calculated to have a correct texture display.
    // For the projection of a texture's texel to be less than or equal to one pixel
    this.geometricError = this.geometry.boundingSphere.radius / SIZE_TEXTURE_TILE;
};

TileMesh.prototype.setTexturesLayer = function setTexturesLayer(textures, layerType, layerId) {
    if (this.material === null) {
        return;
    }
    if (textures) {
        this.material.setTexturesLayer(textures, layerType, layerId);
    }
};

TileMesh.prototype.getLayerTextures = function getLayerTextures(layerType, layerId) {
    const mat = this.material;
    return mat.getLayerTextures(layerType, layerId);
};

TileMesh.prototype.isColorLayerLoaded = function isColorLayerLoaded(layerId) {
    const mat = this.material;
    return mat.getColorLayerLevelById(layerId) > -1;
};

TileMesh.prototype.isElevationLayerLoaded = function isElevationLayerLoaded() {
    return this.material.loadedTexturesCount[l_ELEVATION] > 0;
};

TileMesh.prototype.isColorLayerDownscaled = function isColorLayerDownscaled(layer) {
    const mat = this.material;
    return mat.isColorLayerDownscaled(layer.id, this.getZoomForLayer(layer));
};

TileMesh.prototype.normals = function normals() {
    return this.geometry.normals;
};

TileMesh.prototype.fourCorners = function fourCorners() {
    return this.geometry.fourCorners;
};

TileMesh.prototype.normal = function normal() {
    return this.geometry.normal;
};

TileMesh.prototype.center = function center() {
    return this.geometry.center;
};

TileMesh.prototype.OBB = function OBB() {
    var zFactor = this.material.uniforms.zFactor.value;
    var OBB = this.geometry.OBB;
        OBB.box3D.min.z *= zFactor;
        OBB.box3D.max.z *= zFactor;
    return OBB; 
};

TileMesh.prototype.getIndexLayerColor = function getIndexLayerColor(idLayer) {
    return this.material.indexOfColorLayer(idLayer);
};

TileMesh.prototype.removeColorLayer = function removeColorLayer(idLayer) {
    this.material.removeColorLayer(idLayer);
};

TileMesh.prototype.changeSequenceLayers = function changeSequenceLayers(sequence) {
    const layerCount = this.material.getColorLayersCount();

    // Quit if there is only one layer
    if (layerCount < 2) {
        return;
    }

    this.material.setSequence(sequence);
};

TileMesh.prototype.getCoordsForLayer = function getCoordsForLayer(layer) {
    if (layer.protocol.indexOf('wmts') == 0) {
        OGCWebServiceHelper.computeTileMatrixSetCoordinates(this, layer.options.tileMatrixSet);
        return this.wmtsCoords[layer.options.tileMatrixSet];
    } else if (layer.protocol == 'tms') {
        return OGCWebServiceHelper.computeTMSCoordinates(this, layer.extent);
    } else {
        return [this.extent];
    }
};

TileMesh.prototype.getZoomForLayer = function getCoordsForLayer(layer) {
    if (layer.protocol.indexOf('wmts') == 0) {
        OGCWebServiceHelper.computeTileMatrixSetCoordinates(this, layer.options.tileMatrixSet);
        return this.wmtsCoords[layer.options.tileMatrixSet][0].zoom;
    } else {
        return this.level;
    }
};

export default TileMesh;
