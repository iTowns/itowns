/**
 * Generated On: 2015-10-5
 * Class: TileMesh
 * Description: Tuile de maillage, noeud du quadtree MNT. Le Materiel est issus du QuadTree ORTHO.
 */

import * as THREE from 'three';
import NodeMesh from '../Renderer/NodeMesh';
import LayeredMaterial, { l_ELEVATION } from '../Renderer/LayeredMaterial';
import GlobeDepthMaterial from '../Renderer/GlobeDepthMaterial';
import MatteIdsMaterial from '../Renderer/MatteIdsMaterial';
import RendererConstant from '../Renderer/RendererConstant';

function TileMesh(geometry, params) {
    // Constructor
    NodeMesh.call(this);

    this.matrixAutoUpdate = false;
    this.rotationAutoUpdate = false;

    if (!params.bbox) {
        throw new Error('params.bbox is mandatory to build a TileMesh');
    }

    this.level = params.level;
    this.bbox = params.bbox;

    this.geometry = geometry;
    this.normal = params.center.clone().normalize();

    // TODO Why move sphere center
    this.centerSphere = new THREE.Vector3().addVectors(this.geometry.boundingSphere.center, params.center);

    this.oSphere = new THREE.Sphere(this.centerSphere.clone(), this.geometry.boundingSphere.radius);
    this.texturesNeeded = 0;

    this.materials = [];

    // instantiations all state materials : final, depth, id
    // Final rendering : return layered color + fog
    this.materials[RendererConstant.FINAL] = new LayeredMaterial();
    // Depth : return the distance between projection point and the node
    this.materials[RendererConstant.DEPTH] = new GlobeDepthMaterial(this.materials[RendererConstant.FINAL]);
    // ID : return id color in RGBA (float Pack in RGBA)
    this.materials[RendererConstant.ID] = new MatteIdsMaterial(this.materials[RendererConstant.FINAL]);
    // Set current material in Final Rendering
    this.material = this.materials[RendererConstant.FINAL];

    this.frustumCulled = false;

    // Layer
    this.setDisplayed(false);
}

TileMesh.prototype = Object.create(NodeMesh.prototype);

TileMesh.prototype.constructor = TileMesh;

TileMesh.prototype.dispose = function dispose() {
    // TODO à mettre dans node mesh
    this.material.dispose();
    this.geometry.dispose();
    this.geometry = null;
    this.material = null;
};

TileMesh.prototype.setUuid = function setUuid(uuid) {
    this.id = uuid;
    this.materials[RendererConstant.FINAL].setUuid(uuid);
    this.materials[RendererConstant.ID].setUuid(uuid);
};

TileMesh.prototype.getUuid = function getUuid(uuid) {
    return this.materials[RendererConstant.ID].getUuid(uuid);
};

TileMesh.prototype.setColorLayerParameters = function setColorLayerParameters(paramsTextureColor, lighting) {
    if (!this.loaded) {
        const material = this.materials[RendererConstant.FINAL];
        material.setLightingOn(lighting.enable);
        material.uniforms.lightPosition.value = lighting.position;
        material.setColorLayerParameters(paramsTextureColor);
    }
};
/**
 *
 * @returns {undefined}     */
TileMesh.prototype.disposeChildren = function disposeChildren() {
    this.pendingSubdivision = false;

    while (this.children.length > 0) {
        var child = this.children[0];
        this.remove(child);
        child.dispose();
    }
};

TileMesh.prototype.setDisplayed = function setDisplayed(show) {
    for (var material of this.materials) {
        material.visible = show;
    }
};

TileMesh.prototype.enableRTC = function enableRTC(enable) {
    this.materials[RendererConstant.FINAL].enableRTC(enable);
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

TileMesh.prototype.setMatrixRTC = function setMatrixRTC(rtc) {
    for (var material of this.materials) {
        material.setMatrixRTC(rtc);
    }
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

    this.loadingCheck();
};

TileMesh.prototype.setBBoxZ = function setBBoxZ(min, max) {
    if (Math.floor(min) !== Math.floor(this.bbox.bottom()) || Math.floor(max) !== Math.floor(this.bbox.top())) {
        this.bbox.setBBoxZ(min, max);
        var delta = this.geometry.OBB.addHeight(this.bbox);

        var trans = this.normal.clone().setLength(delta.y);

        this.geometry.boundingSphere.radius = Math.sqrt(delta.x * delta.x + this.oSphere.radius * this.oSphere.radius);
        this.centerSphere = new THREE.Vector3().addVectors(this.oSphere.center, trans);
    }
};

TileMesh.prototype.setTexturesLayer = function setTexturesLayer(textures, layerType, layerId) {
    if (this.material === null) {
        return;
    }
    if (textures) {
        this.material.setTexturesLayer(textures, layerType, layerId);
    }
    this.loadingCheck();
};

TileMesh.prototype.getLayerTextures = function getLayerTextures(layerType, layerId) {
    var mat = this.materials[RendererConstant.FINAL];
    return mat.getLayerTextures(layerType, layerId);
};

TileMesh.prototype.isColorLayerLoaded = function isColorLayerLoaded(layerId) {
    var mat = this.materials[RendererConstant.FINAL];
    return mat.getColorLayerLevelById(layerId) > -1;
};

TileMesh.prototype.isElevationLayerLoaded = function isElevationLayerLoaded() {
    var mat = this.materials[RendererConstant.FINAL];
    return mat.getElevationLayerLevel() > -1;
};

TileMesh.prototype.isColorLayerDownscaled = function isColorLayerDownscaled(layerId) {
    var mat = this.materials[RendererConstant.FINAL];
    return mat.isColorLayerDownscaled(layerId, this.level);
};

TileMesh.prototype.isLayerTypeDownscaled = function isLayerTypeDownscaled(layerType) {
    var mat = this.materials[RendererConstant.FINAL];
    return mat.isLayerTypeDownscaled(layerType, this.level);
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

TileMesh.prototype.allTexturesAreLoaded = function allTexturesAreLoaded() {
    return this.texturesNeeded === this.materials[RendererConstant.FINAL].getLoadedTexturesCount();
};

TileMesh.prototype.loadingCheck = function loadingCheck() {
    if (this.allTexturesAreLoaded()) {
        this.loaded = true;
        this.parent.childrenLoaded();
    }
};

TileMesh.prototype.getIndexLayerColor = function getIndexLayerColor(idLayer) {
    return this.materials[RendererConstant.FINAL].indexOfColorLayer(idLayer);
};

TileMesh.prototype.removeColorLayer = function removeColorLayer(idLayer) {
    const index = this.materials[RendererConstant.FINAL].indexOfColorLayer(idLayer);
    const texturesCount = this.materials[RendererConstant.FINAL].getTextureCountByLayerIndex(index);
    this.materials[RendererConstant.FINAL].removeColorLayer(idLayer);
    this.texturesNeeded -= texturesCount;
    this.loadingCheck();
};

TileMesh.prototype.changeSequenceLayers = function changeSequenceLayers(sequence) {
    var layerCount = this.materials[RendererConstant.FINAL].getColorLayersCount();

    // Quit if there is only one layer
    if (layerCount < 2) {
        return;
    }

    this.materials[RendererConstant.FINAL].setSequence(sequence);
};

export default TileMesh;
