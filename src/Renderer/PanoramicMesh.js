/**
 * Generated On: 2015-10-5
 * Class: PanoramicMesh
 * PanoramicMesh is using projectiveTextureMaterial to texture geometryProj 
 * 
 */



define('Renderer/PanoramicMesh', ['THREE', 'Renderer/ProjectiveTexturingMaterial','MobileMapping/GeometryProj','Renderer/NodeMesh'], 
function(
        THREE,
        ProjectiveTexturingMaterial,
        GeometryProj,
        NodeMesh
        ) {


    var PanoramicMesh = function(geom, mat, absC) {
        
        NodeMesh.call(this);
        
        this.matrixAutoUpdate = false;
        this.rotationAutoUpdate = false;
        
        this.geometry = geom;
        this.material = mat;
        this.absoluteCenter = absC;
        this.position.copy(this.absoluteCenter);
        this.name = "terrestrialMesh";
        
        
        this.frustumCulled = false;

        console.log("this.absoluteCenter",this.absoluteCenter);
    };

    PanoramicMesh.prototype = Object.create(NodeMesh.prototype);
    PanoramicMesh.prototype.constructor = PanoramicMesh;

    
    PanoramicMesh.prototype.setGeometry = function(geom){
        
      this.geometry = geom;
        
    };
    
    PanoramicMesh.prototype.setMaterial = function(mat){
        
      this.material = mat;
        
    };
    
    PanoramicMesh.prototype.setMatrixRTC = function(rtc) {
        //this.material.setMatrixRTC(rtc);
        this.material.uniforms.mVPMatRTC.value = rtc;
    };
    
    PanoramicMesh.prototype.useParent = function() {
    //    return this.level !== this.levelTerrain;
    };

    PanoramicMesh.prototype.enableRTC = function(enable) {
      //  this.material.enableRTC(enable);
    };

    PanoramicMesh.prototype.enablePickingRender = function(enable) {
      //  this.material.enablePickingRender(enable);
    };

    PanoramicMesh.prototype.setFog = function(fog) {
      //  this.material.setFogDistance(fog);
    };
    
    PanoramicMesh.prototype.setSelected = function(select) {
      //  this.material.setSelected(select);
    };
    


    return PanoramicMesh;

});
