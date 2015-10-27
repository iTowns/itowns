/**
* Generated On: 2015-10-5
* Class: EllipsoidTileMesh
* Description: Tuile de maillage, noeud du quadtree MNT. Le Materiel est issus du QuadTree ORTHO.
*/

/**
 * 
 * @param {type} NodeMesh
 * @param {type} EllipsoidTileGeometry
 * @param {type} BoudingBox
 * @param {type} defaultValue
 * @param {type} THREE
 * @param {type} Material
 * @returns {EllipsoidTileMesh_L10.EllipsoidTileMesh}
 */
define('Globe/EllipsoidTileMesh',['Renderer/NodeMesh','Globe/EllipsoidTileGeometry','Scene/BoudingBox','Core/defaultValue','THREE','Renderer/Material'], function(NodeMesh,EllipsoidTileGeometry,BoudingBox,defaultValue,THREE,Material){
 

    function EllipsoidTileMesh(bbox,VS,PS,zoom){
        //Constructor
        NodeMesh.call( this );
        
        this.showHelper = true;
        
        this.bbox       = defaultValue(bbox,new BoudingBox());
        this.geometry   = new EllipsoidTileGeometry(bbox);               
        this.tMat       = new Material(VS,PS,bbox,zoom);
        
        this.material   = this.tMat.shader;//new THREE.MeshBasicMaterial( {color: 0xffffff, wireframe: false}); 
        this.dot        = 0;
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
    
    EllipsoidTileMesh.prototype.setTextureTerrain = function(texture)
    {         
        this.tMat.setTexture(texture,0);        
    };   
    
    EllipsoidTileMesh.prototype.setTextureOrtho = function(texture,id)
    {         
        id = id === undefined ? 0 : id;
        this.tMat.setTexture(texture,1,id);        
    };   
    
    EllipsoidTileMesh.prototype.normals = function()
    { 
        return this.geometry.normals;
    };
    
     EllipsoidTileMesh.prototype.fourCorners = function()
    { 
        return this.geometry.fourCorners;
    };
    
    EllipsoidTileMesh.prototype.normal = function()
    { 
        return this.geometry.normal;
    };
    
    EllipsoidTileMesh.prototype.center = function()
    { 
        return this.geometry.center;
    };
    
    return EllipsoidTileMesh;
    
});