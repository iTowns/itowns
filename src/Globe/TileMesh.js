/**
 * Generated On: 2015-10-5
 * Class: TileMesh
 * Description: Tuile de maillage, noeud du quadtree MNT. Le Materiel est issus du QuadTree ORTHO.
 */

/**
 *
 * @param {type} TileGeometry
 * @param {type} BoundingBox
 * @param {type} THREE
 * @param {type} OBBHelper
 * @param {type} SphereHelper
 * @param {type} LayeredMaterial
 * @param {type} GeoCoordinate
 * @returns {EllipsoidTileMesh_L20.TileMesh}
 */
import TileGeometry from 'Globe/TileGeometry';
import * as THREE from 'three';
import OBBHelper from 'Renderer/ThreeExtended/OBBHelper';
import SphereHelper from 'Renderer/ThreeExtended/SphereHelper';
import LayeredMaterial, { l_ELEVATION } from 'Renderer/LayeredMaterial';
import GlobeDepthMaterial from 'Renderer/GlobeDepthMaterial';
import MatteIdsMaterial from 'Renderer/MatteIdsMaterial';
import RendererConstant from 'Renderer/RendererConstant';

function TileMesh(params, builder, geometryCache) {
    // Constructor
    THREE.Mesh.call(this);

    this.matrixAutoUpdate = false;
    this.rotationAutoUpdate = false;

    if (!params.bbox) {
        throw new Error('params.bbox is mandatory to build a TileMesh');
    }

    this.level = params.level;
    this.bbox = params.bbox;

    this.geometry = geometryCache || new TileGeometry(params, builder);
    this.normal = params.center.clone().normalize();

    var worldNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(this.OBB().getWorldQuaternion());
    // distance to globe center
    this.distance = params.center.clone().projectOnVector(worldNormal).length();

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

TileMesh.prototype.setColorLayerParameters = function setColorLayerParameters(paramsTextureColor) {
    if (!this.loaded) {
        this.materials[RendererConstant.FINAL].setColorLayerParameters(paramsTextureColor);
    }
};

TileMesh.prototype.isVisible = function isVisible() {
    return this.visible;
};

TileMesh.prototype.setVisibility = function setVisibility(show) {
    this.visible = show;
};

TileMesh.prototype.isDisplayed = function isDisplayed() {
    return this.material.visible;
};

TileMesh.prototype.setDisplayed = function setDisplayed(show) {
    for (const mat of this.materials) {
        mat.visible = show;
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
};

TileMesh.prototype.getNodeAtLevel = function getNodeAtLevel(level) {
    if (level === this.level) {
        return this;
    }
    if (this.parent == null) {
        return undefined;
    }

    var functionToCheck = this.parent.getNodeAtLevel;

    if (!functionToCheck || !(typeof (functionToCheck) === 'function') && (this.parent.level !== level)) {
        return undefined;
    }

    return (this.parent.level === level) ? this.parent : this.parent.getNodeAtLevel(level);
};


TileMesh.prototype.setBBoxZ = function setBBoxZ(min, max) {
    if (Math.floor(min) !== Math.floor(this.bbox.bottom()) || Math.floor(max) !== Math.floor(this.bbox.top())) {
        this.bbox.setBBoxZ(min, max);
        var delta = this.geometry.OBB.addHeight(this.bbox);

        var trans = this.normal.clone().setLength(delta.y);

        this.geometry.boundingSphere.radius = Math.sqrt(delta.x * delta.x + this.oSphere.radius * this.oSphere.radius);
        this.centerSphere = new THREE.Vector3().addVectors(this.oSphere.center, trans);

        if (this.helper instanceof OBBHelper) {
            this.helper.update(this.geometry.OBB);
            this.helper.translateZ(this.distance);
        } else if (this.helper instanceof SphereHelper) {
            this.helper.update(this.geometry.boundingSphere.radius);
            this.helper.position.add(trans);
        }
    }
};

TileMesh.prototype.setTexturesLayer = function setTexturesLayer(textures, layerType, layer) {
    if (this.material === null) {
        return;
    }
    if (textures) {
        this.material.setTexturesLayer(textures, layerType, layer);
    }
};

TileMesh.prototype.isColorLayerDownscaled = function isColorLayerDownscaled(layer) {
    var mat = this.materials[RendererConstant.FINAL];
    return mat.isColorLayerDownscaled(layer, this.level);
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

TileMesh.prototype.getIndexLayerColor = function getIndexLayerColor(idLayer) {
    return this.materials[RendererConstant.FINAL].indexOfColorLayer(idLayer);
};

TileMesh.prototype.removeColorLayer = function removeColorLayer(idLayer) {
    const index = this.materials[RendererConstant.FINAL].indexOfColorLayer(idLayer);
    const texturesCount = this.materials[RendererConstant.FINAL].getTextureCountByLayerIndex(index);
    this.materials[RendererConstant.FINAL].removeColorLayer(idLayer);
    this.texturesNeeded -= texturesCount;
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
