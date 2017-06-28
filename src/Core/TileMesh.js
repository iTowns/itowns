/**
 * Generated On: 2015-10-5
 * Class: TileMesh
 * Description: Tuile de maillage, noeud du quadtree MNT. Le Materiel est issus du QuadTree ORTHO.
 */

import * as THREE from 'three';
import LayeredMaterial, { l_ELEVATION } from '../Renderer/LayeredMaterial';
import TileDepthMaterial from '../Renderer/TileDepthMaterial';
import MatteIdsMaterial from '../Renderer/MatteIdsMaterial';
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

    // TODO Why move sphere center
    this.centerSphere = new THREE.Vector3().addVectors(this.geometry.boundingSphere.center, params.center);

    this.oSphere = new THREE.Sphere(this.centerSphere.clone(), this.geometry.boundingSphere.radius);

    this.materials = [];

    // instantiations all state materials : final, depth, id
    // Final rendering : return layered color + fog
    this.materials[RendererConstant.FINAL] = new LayeredMaterial(params.materialOptions);

    // Depth : return the distance between projection point and the node
    this.materials[RendererConstant.DEPTH] = new TileDepthMaterial(this.materials[RendererConstant.FINAL]);
    // ID : return id color in RGBA (float Pack in RGBA)
    this.materials[RendererConstant.ID] = new MatteIdsMaterial(this.materials[RendererConstant.FINAL]);
    // Set current material in Final Rendering
    this.material = this.materials[RendererConstant.FINAL];

    this.frustumCulled = false;

    this.updateGeometricError();

    // Layer
    this.setDisplayed(false);

    this.layerUpdateState = {};
}

TileMesh.prototype = Object.create(THREE.Mesh.prototype);
TileMesh.prototype.constructor = TileMesh;

TileMesh.prototype.dispose = function dispose() {
    this.material.dispose();
    this.geometry.dispose();
    this.geometry = null;
    this.material = null;
};

TileMesh.prototype.setUuid = function setUuid() {
    this.materials[RendererConstant.FINAL].setUuid(this.id);
    this.materials[RendererConstant.ID].setUuid(this.id);
};

TileMesh.prototype.getUuid = function getUuid() {
    return this.materials[RendererConstant.ID].getUuid();
};

TileMesh.prototype.isVisible = function isVisible() {
    return this.visible;
};

TileMesh.prototype.setDisplayed = function setDisplayed(show) {
    for (const material of this.materials) {
        material.visible = show;
    }
};

TileMesh.prototype.setVisibility = function setVisibility(show) {
    this.visible = show;
};

TileMesh.prototype.isDisplayed = function isDisplayed() {
    return this.material.visible;
};

// switch material in function of state
TileMesh.prototype.changeState = function changeState(state) {
    if (state !== RendererConstant.FINAL) {
        this.materials[state].visible = this.materials[RendererConstant.FINAL].visible;
    }

    this.material = this.materials[state];
};

TileMesh.prototype.setFog = function setFog(fog) {
    this.materials[RendererConstant.FINAL].setFogDistance(fog);
};

TileMesh.prototype.setDebug = function setDebug(enable) {
    this.materials[RendererConstant.FINAL].setDebug(enable);
};

TileMesh.prototype.setSelected = function setSelected(select) {
    this.materials[RendererConstant.FINAL].setSelected(select);
};

TileMesh.prototype.setTextureElevation = function setTextureElevation(elevation) {
    if (this.materials[RendererConstant.FINAL] === null) {
        return;
    }

    const offsetScale = elevation.pitch || new THREE.Vector3(0, 0, 1);
    this.setBBoxZ(elevation.min, elevation.max);

    this.materials[RendererConstant.FINAL].setTexture(elevation.texture, l_ELEVATION, 0, offsetScale);
    this.materials[RendererConstant.DEPTH].uniforms.texturesCount.value = this.materials[RendererConstant.FINAL].loadedTexturesCount[0];
    this.materials[RendererConstant.ID].uniforms.texturesCount.value = this.materials[RendererConstant.FINAL].loadedTexturesCount[0];
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
        this.centerSphere = new THREE.Vector3().addVectors(this.oSphere.center, trans);
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
    const mat = this.materials[RendererConstant.FINAL];
    return mat.getLayerTextures(layerType, layerId);
};

TileMesh.prototype.isColorLayerLoaded = function isColorLayerLoaded(layerId) {
    const mat = this.materials[RendererConstant.FINAL];
    return mat.getColorLayerLevelById(layerId) > -1;
};

TileMesh.prototype.isElevationLayerLoaded = function isElevationLayerLoaded() {
    const mat = this.materials[RendererConstant.FINAL];
    return mat.getElevationLayerLevel() > -1;
};

TileMesh.prototype.isColorLayerDownscaled = function isColorLayerDownscaled(layer) {
    const mat = this.materials[RendererConstant.FINAL];
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
    return this.geometry.OBB;
};

TileMesh.prototype.getIndexLayerColor = function getIndexLayerColor(idLayer) {
    return this.materials[RendererConstant.FINAL].indexOfColorLayer(idLayer);
};

TileMesh.prototype.removeColorLayer = function removeColorLayer(idLayer) {
    this.materials[RendererConstant.FINAL].removeColorLayer(idLayer);
};

TileMesh.prototype.changeSequenceLayers = function changeSequenceLayers(sequence) {
    const layerCount = this.materials[RendererConstant.FINAL].getColorLayersCount();

    // Quit if there is only one layer
    if (layerCount < 2) {
        return;
    }

    this.materials[RendererConstant.FINAL].setSequence(sequence);
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
