/**
* Generated On: 2015-10-5
* Class: EllipsoidTileMesh
* Description: Tuile de maillage, noeud du quadtree MNT. Le Materiel est issus du QuadTree ORTHO.
*/

define('Globe/EllipsoidTileMesh',['Renderer/NodeMesh','Globe/EllipsoidTileGeometry','Scene/BoudingBox','Core/defaultValue','THREE'], function(NodeMesh,EllipsoidTileGeometry,BoudingBox,defaultValue,THREE){
 

    function EllipsoidTileMesh(bbox){
        //Constructor
        NodeMesh.call( this );
        
        this.bbox       = defaultValue(bbox,new BoudingBox());
        this.geometry   = new EllipsoidTileGeometry(bbox);
      
    }

    EllipsoidTileMesh.prototype = Object.create( NodeMesh.prototype );

    EllipsoidTileMesh.prototype.constructor = EllipsoidTileMesh;
            
    EllipsoidTileMesh.prototype.subdivise = function(subBBox)
    {        
        var sublevel = this.level + 1;
        for(var i = 0;i< subBBox.length;i++)
        {
            var tileMesh        = new EllipsoidTileMesh(subBBox[i]);
            tileMesh.position.set(tileMesh.bbox.center.x-this.bbox.center.x,tileMesh.bbox.center.y-this.bbox.center.y,0);
            this.add(tileMesh);
            tileMesh.level = sublevel;

        }
    };
    
    EllipsoidTileMesh.prototype.setTexture = function(texture)
    { 
        this.material = new THREE.MeshBasicMaterial( {color: 0xffffff, map: texture} );        
    };
    
    return EllipsoidTileMesh;
    
});