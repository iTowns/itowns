/**
* Generated On: 2015-10-5
* Class: EllipsoidTileMesh
* Description: Tuile de maillage, noeud du quadtree MNT. Le Materiel est issus du QuadTree ORTHO.
*/

define('Globe/EllipsoidTileMesh',['Renderer/NodeMesh','Globe/EllipsoidTileGeometry'], function(NodeMesh,EllipsoidTileGeometry){
 

    function EllipsoidTileMesh(){
        //Constructor
        NodeMesh.call( this );
        
        // add first tile mesh
        this.geometry = new EllipsoidTileGeometry();
    }

    EllipsoidTileMesh.prototype = Object.create( NodeMesh.prototype );

    EllipsoidTileMesh.prototype.constructor = EllipsoidTileMesh;

    return EllipsoidTileMesh;
    
});