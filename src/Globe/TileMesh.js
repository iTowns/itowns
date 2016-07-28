/**
 * Generated On: 2015-10-5
 * Class: TileMesh
 * Description: Tuile de maillage, noeud du quadtree MNT. Le Materiel est issus du QuadTree ORTHO.
 */

/**
 *
 * @param {type} NodeMesh
 * @param {type} TileGeometry
 * @param {type} BoundingBox
 * @param {type} defaultValue
 * @param {type} THREE
 * @param {type} OBBHelper
 * @param {type} SphereHelper
 * @param {type} LayeredMaterial
 * @param {type} CoordCarto
 * @returns {EllipsoidTileMesh_L20.TileMesh}
 */
import NodeMesh from 'Renderer/NodeMesh';
import TileGeometry from 'Globe/TileGeometry';
import BoundingBox from 'Scene/BoundingBox';
import defaultValue from 'Core/defaultValue';
import THREE from 'THREE';
import OBBHelper from 'OBBHelper';
import SphereHelper from 'SphereHelper';
import LayeredMaterial from 'Renderer/LayeredMaterial';
import GlobeDepthMaterial from 'Renderer/GlobeDepthMaterial';
import MatteIdsMaterial from 'Renderer/MatteIdsMaterial';
import RendererConstant from 'Renderer/RendererConstant';

var groupelevation = [14, 11, 7, 3];
var l_ELEVATION = 0;
var l_COLOR = 1;

function TileMesh(params, builder, geometryCache) {
    //Constructor
    NodeMesh.call(this);

    this.matrixAutoUpdate = false;
    this.rotationAutoUpdate = false;

    this.level = params.zoom;
    this.bbox = defaultValue(params.bbox, new BoundingBox());

    this.geometry = defaultValue(geometryCache, new TileGeometry(params, builder));
    this.normal = params.center.clone().normalize();

    this.distance = params.center.length();

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
    this.levelElevation = this.level;

    // TODO not generic
    for (var i = 0; i < groupelevation.length; i++) {
        var gLev = groupelevation[i];
        if (this.level >= gLev) {
            this.levelElevation = gLev;
            break;
        }
    }

    // Layer
    this.currentElevation = -1;
    this.setDisplayed(false);

}

TileMesh.prototype = Object.create(NodeMesh.prototype);

TileMesh.prototype.constructor = TileMesh;

TileMesh.prototype.buildHelper = function() {

    // TODO Dispose HELPER!!!
    var text = (this.level + 1).toString();

    var showHelperBox = true;

    if (showHelperBox)
        this.helper = new OBBHelper(this.geometry.OBB, text);
    else
        this.helper = new SphereHelper(this.geometry.boundingSphere.radius);

    if (this.helper instanceof SphereHelper)

        this.helper.position.add(new THREE.Vector3().setFromMatrixPosition(this.matrixWorld));

    else if (this.helper instanceof OBBHelper)

        this.helper.translateZ(this.distance);

    this.link.add(this.helper);

};

TileMesh.prototype.dispose = function() {
    // TODO à mettre dans node mesh
    this.material.dispose();
    this.geometry.dispose();
    this.geometry = null;
    this.material = null;
};

TileMesh.prototype.setUuid = function(uuid) {
    this.id = uuid;
    this.materials[RendererConstant.FINAL].setUuid(uuid);
    this.materials[RendererConstant.ID].setUuid(uuid);

};

TileMesh.prototype.getUuid = function(uuid) {

    return this.materials[RendererConstant.ID].getUuid(uuid);
}

TileMesh.prototype.setColorLayerParameters = function(paramsTextureColor) {
    this.materials[RendererConstant.FINAL].setParam(paramsTextureColor);
};
/**
 *
 * @returns {undefined}     */
TileMesh.prototype.disposeChildren = function() {
    while (this.children.length > 0) {
        var child = this.children[0];
        this.remove(child);
        child.dispose();
    }
};

TileMesh.prototype.setDisplayed = function(show) {

    for (var key in this.materials) {
        this.materials[key].visible = show;
    }

    if (this.helper !== undefined) {
        this.helper.setMaterialVisibility(show);
    }

    if (this.content !== null && show) {
        this.content.visible = true;
    }
};

TileMesh.prototype.enableRTC = function(enable) {
    this.materials[RendererConstant.FINAL].enableRTC(enable);
};

// switch material in function of state
TileMesh.prototype.changeState = function(state) {

    if (state !== RendererConstant.FINAL) {
        this.materials[state].visible = this.materials[RendererConstant.FINAL].visible;
    }

    this.material = this.materials[state];
};

TileMesh.prototype.setFog = function(fog) {
    this.materials[RendererConstant.FINAL].setFogDistance(fog);
};

TileMesh.prototype.setMatrixRTC = function(rtc) {
    for (var key in this.materials) {
        this.materials[key].setMatrixRTC(rtc);
    }
};

TileMesh.prototype.setDebug = function(enable) {
    this.materials[RendererConstant.FINAL].setDebug(enable);
};

TileMesh.prototype.setSelected = function(select) {

    this.materials[RendererConstant.FINAL].setSelected(select);
};

TileMesh.prototype.parseBufferElevation = function(image, minMax, pitScale) {

    var buffer = image.data;

    var size = Math.floor(pitScale.z * image.width);
    var xs = Math.floor(pitScale.x * image.width);
    var ys = Math.floor(pitScale.y * image.width);

    var oMinMax = minMax.clone();

    minMax.y = -1000000;
    minMax.x = 1000000;

    var inc = Math.max(Math.floor(size / 8), 2);

    for (var y = ys; y < ys + size; y += inc) {
        var pit = y * image.width;
        for (var x = xs; x < xs + size; x += inc) {
            var val = buffer[pit + x];
            if (val > -10.0 && val !== undefined) {
                minMax.y = Math.max(minMax.y, val);
                minMax.x = Math.min(minMax.x, val);
            }
        }
    }

    if (minMax.x === 1000000 || minMax.y === -1000000)
        minMax.copy(oMinMax);

};

TileMesh.prototype.setTextureElevation = function(elevation) {
    if (this.materials[RendererConstant.FINAL] === null) {
        return;
    }

    var texture = undefined;
    var pitScale;

    if (elevation === -1) { // No texture
        this.currentElevation = -2;
    } else if (elevation === -2) { // get ancestor texture
        var levelAncestor = this.getParentNotDownScaled(l_ELEVATION).currentElevation;
        var ancestor = this.getParentLevel(levelAncestor);
        var minMax = new THREE.Vector2();


        if (ancestor) { // TODO WHY -> because levelAncestor === -2
            pitScale = ancestor.bbox.pitScale(this.bbox);
            texture = ancestor.materials[RendererConstant.FINAL].Textures[l_ELEVATION][0];
            var image = texture.image;

            minMax.y = ancestor.bbox.maxCarto.altitude;
            minMax.x = ancestor.bbox.minCarto.altitude;

            this.parseBufferElevation(image, minMax, pitScale);

            if (minMax.x !== 0 && minMax.y !== 0) {
                this.setBBoxZ(minMax.x, minMax.y);
            }

            this.currentElevation = ancestor.currentElevation;
        } else {
            this.currentElevation = -2;
        }
    } else {
        texture = elevation.texture;
        pitScale = new THREE.Vector3(0, 0, 1);
        this.setBBoxZ(elevation.min, elevation.max);
        this.currentElevation = elevation.level;
    }

    this.materials[RendererConstant.FINAL].setTexture(texture, l_ELEVATION, 0, pitScale);

    this.materials[RendererConstant.DEPTH].uniforms.nbTextures.value = this.materials[RendererConstant.FINAL].nbTextures[0];
    this.materials[RendererConstant.ID].uniforms.nbTextures.value = this.materials[RendererConstant.FINAL].nbTextures[0];


    this.loadingCheck();
};

TileMesh.prototype.setBBoxZ = function(min, max) {

    if (Math.floor(min) !== Math.floor(this.bbox.minCarto.altitude) || Math.floor(max) !== Math.floor(this.bbox.maxCarto.altitude)) {

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

TileMesh.prototype.setTexturesLayer = function(textures, idLayer) {
    if (this.material === null) {
        return;
    }
    if (textures) {
        this.material.setTexturesLayer(textures, idLayer);
    }
    this.loadingCheck();
};

TileMesh.prototype.downScaledLayer = function(id) {
    if (id === l_ELEVATION) {
        if (this.currentElevation === -2) {
            return false;
        } else {
            return this.currentElevation < this.levelElevation;
        }
    } else if (id === l_COLOR) {
        return this.materials[RendererConstant.FINAL].getLevelLayerColor(l_COLOR) < this.level + this.materials[RendererConstant.FINAL].getDelta();
    }

    return false;
};

TileMesh.prototype.getDownScaledLayer = function() {
    if (this.downScaledLayer(l_COLOR))
        return l_COLOR;
    else if (this.downScaledLayer(l_ELEVATION))
        return l_ELEVATION;
    else
        return undefined;
};

TileMesh.prototype.normals = function() {
    return this.geometry.normals;
};

TileMesh.prototype.fourCorners = function() {
    return this.geometry.fourCorners;
};

TileMesh.prototype.normal = function() {
    return this.geometry.normal;
};

TileMesh.prototype.center = function() {
    return this.geometry.center;
};

TileMesh.prototype.OBB = function() {
    return this.geometry.OBB;
};

TileMesh.prototype.getParentNotDownScaled = function(layer) {
    if (this.parent.downScaledLayer)
        return !this.parent.downScaledLayer(layer) ? this.parent : this.parent.getParentNotDownScaled(layer);
    else
        return null;
};

TileMesh.prototype.getLevelNotDownScaled = function() {
    return (this.getParentNotDownScaled(1) || this).level;
};

TileMesh.prototype.allTexturesAreLoaded = function() {
    return this.texturesNeeded === this.materials[RendererConstant.FINAL].nbLoadedTextures();
};

TileMesh.prototype.loadingCheck = function() {

    if (this.allTexturesAreLoaded()) {
        this.loaded = true;
        this.parent.childrenLoaded();
    }
};

TileMesh.prototype.getIndexLayerColor = function(idLayer) {
    return this.materials[RendererConstant.FINAL].layerIdToIndex[idLayer];
};

TileMesh.prototype.removeLayerColor = function(idLayer) {
    var nbTextures = this.materials[RendererConstant.FINAL].nbLoadedTextures();
    this.materials[RendererConstant.FINAL].removeLayerColor(idLayer);
    this.texturesNeeded -= nbTextures - this.materials[RendererConstant.FINAL].nbLoadedTextures();
};

TileMesh.prototype.changeSequenceLayers = function(sequence) {
    var layerCount = this.materials[RendererConstant.FINAL].layerIdToIndex.length;
    if (layerCount < 2)
        return;

    var newSequence, layer;

    if (sequence.length !== layerCount) {
        newSequence = sequence.slice(0);
        var max = newSequence.length;

        for (var i = 0; i < max; i++) {
            layer = newSequence[i];
            if (layer && this.getIndexLayerColor(layer) === -1)
                newSequence.splice(i, 1);
        }
    } else
        newSequence = sequence;

    var sequenceMaterial = [];

    for (var l = 0; l < newSequence.length; l++) {
        var index = this.getIndexLayerColor(newSequence[l]);
        sequenceMaterial[l] = index;
    }

    this.materials[RendererConstant.FINAL].setSequence(sequenceMaterial);
};

export default TileMesh;
