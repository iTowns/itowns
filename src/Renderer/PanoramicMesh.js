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


    var PanoramicMesh = function() {
        
        NodeMesh.call(this);
        
    };

    PanoramicMesh.prototype = Object.create(NodeMesh.prototype);
    PanoramicMesh.prototype.constructor = PanoramicMesh;

    
    PanoramicMesh.prototype.setGeometry = function(geom){
        
      this.geometry = geom;
        
    };
    
     PanoramicMesh.prototype.setMaterial = function(mat){
        
      this.material = mat;
        
    };
    
    


    return PanoramicMesh;

});
