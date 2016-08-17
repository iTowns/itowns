/**
* Class: BuildingTile
* Description: Tile containing a set of 3D buildings
*/


import BoundingBox from 'Scene/BoundingBox';
import NodeMesh from 'Renderer/NodeMesh';
import MultiGeometryMaterial from 'Renderer/MultiGeometryMaterial';
import THREE from 'THREE';
import BasicNormalMaterial from 'Renderer/BasicNormalMaterial';
import BasicIdsMaterial from 'Renderer/BasicIdsMaterial';
import RendererConstant from 'Renderer/RendererConstant';

function BuildingTile(params) {
    //Constructor
    NodeMesh.call(this);
    this.bboxId = params.id;
    this.bbox = new BoundingBox(params.bbox[0], params.bbox[3],
        params.bbox[1], params.bbox[4],
        params.bbox[2], params.bbox[5]);
    this.box3D = new THREE.Box3(new THREE.Vector3(params.bbox[0], params.bbox[1], params.bbox[2]),
        new THREE.Vector3(params.bbox[3], params.bbox[4], params.bbox[5]));
    this.level = params.level;
    this.childrenBboxes = params.childrenBboxes;
    this.geometricError = ((params.bbox[3] - params.bbox[0]) +
        (params.bbox[4] - params.bbox[1])) / 100;
    // TODO: geometric error doesn't really make sense in our case

    this.geometry = params.geometry;
    this.centerSphere = this.geometry.boundingSphere.center;
    this.properties = params.properties;

    var m = 10000;
    this.randomId = Math.random() * m;
    this.material = new MultiGeometryMaterial(new THREE.Color(0.8, 0.8, 0.8), this.id/*this.randomId*/);
    this.materials = [];

    // instantiations all state materials : final, depth, id
    // Final rendering : return layered color + fog
    this.materials[RendererConstant.FINAL] = this.material;
    // Depth : return the distance between projection point and the node
    this.materials[RendererConstant.DEPTH] = new BasicNormalMaterial(this.materials[RendererConstant.FINAL]);
    // ID : return id color in RGBA (float Pack in RGBA)
    this.materials[RendererConstant.ID] = new BasicIdsMaterial(this.materials[RendererConstant.FINAL]);

    this.materials[RendererConstant.FINAL].uniforms.normalTexture = {
        type: "t"
    };
    this.materials[RendererConstant.FINAL].uniforms.resolution = {
        type: "2fv",
        value: [200, 200]
    };
}

BuildingTile.prototype = Object.create(NodeMesh.prototype);

BuildingTile.prototype.constructor = BuildingTile;

BuildingTile.prototype.dispose = function() {
    // TODO à mettre dans node mesh
    this.material.dispose();
    this.geometry.dispose();
    this.geometry = null;
    this.material = null;
};

BuildingTile.prototype.disposeChildren = function() {
    while (this.children.length > 0) {
        var child = this.children[0];
        this.remove(child);
        child.dispose();
    }
};

BuildingTile.prototype.enableRTC = function(enable) {
    this.material.enableRTC(enable);
    for (var i=0; i<this.materials.length; i++) {
        this.materials[i].enableRTC(enable);
    }
};

BuildingTile.prototype.setFog = function(fog) {
    this.material.setFogDistance(fog);
    for (var i=0; i<this.materials.length; i++) {
        this.materials[i].setFogDistance(fog);
    }
};

BuildingTile.prototype.setMatrixRTC = function(rtc) {
    this.material.setMatrixRTC(rtc);
    for (var i=0; i<this.materials.length; i++) {
        this.materials[i].setMatrixRTC(rtc);
    }
};

BuildingTile.prototype.setDebug = function(enable) {
    this.material.setDebug(enable);
};

BuildingTile.prototype.setSelected = function(select, index) {
    this.material.setSelected(select, index);
};

BuildingTile.prototype.getSelectedIndex = function() {
    return this.material.getSelectedIndex();
};

// switch material in function of state
BuildingTile.prototype.changeState = function(state) {

    if (state !== RendererConstant.FINAL) {
        this.materials[state].visible = this.materials[RendererConstant.FINAL].visible;
    }

    this.material = this.materials[state];
};

export default BuildingTile;
