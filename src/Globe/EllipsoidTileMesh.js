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
define('Globe/EllipsoidTileMesh',[
    'Renderer/NodeMesh',
    'Globe/EllipsoidTileGeometry',
    'Scene/BoudingBox',
    'Core/defaultValue',
    'THREE',
    'Renderer/Material','text!Renderer/Shader/GlobeVS.glsl',
        'text!Renderer/Shader/GlobeFS.glsl'], function(NodeMesh,EllipsoidTileGeometry,BoudingBox,defaultValue,THREE,Material,GlobeVS,GlobeFS){
 

    function EllipsoidTileMesh(bbox,cooWMTS,ellipsoid,parent){
        //Constructor
        NodeMesh.call( this );
        
        this.showHelper = true;
        this.level      = cooWMTS.zoom;
        this.cooWMTS    = cooWMTS;
        this.bbox       = defaultValue(bbox,new BoudingBox());        
        
        var precision   = 8;
        
        
        if(this.level > 11)
            precision   = 128;
        else if(this.level > 8)
            precision   = 32;
        else if (this.level > 6)
            precision   = 16;
        
        var levelMax = 16;
        
        this.geometricError  = Math.pow(2,levelMax- this.level);
        
        this.geometry   = new EllipsoidTileGeometry(bbox,precision,ellipsoid);
             
        var posParent   = new THREE.Vector3();
        
        if(parent.geometry !== undefined)        
            posParent = parent.geometry.center;
        
        var center    = new THREE.Vector3().subVectors(this.geometry.center,posParent);
        
        this.position.copy(center);
        
        this.absCenterSphere = new THREE.Vector3().addVectors(this.geometry.boundingSphere.center,this.geometry.center);
        
        //this.geometry.boundingSphere.center.add(this.geometry.center);
        
        this.tMat       = new Material(GlobeVS,GlobeFS,bbox,cooWMTS.zoom);                
        this.orthoNeed  = 10;
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
    
    EllipsoidTileMesh.prototype.setAltitude = function(min,max)
    {         
        this.bbox.setAltitude(min,max);
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
    
    EllipsoidTileMesh.prototype.OBB = function()
    { 
        return this.geometry.OBB;
    };
    
    return EllipsoidTileMesh;
    
});