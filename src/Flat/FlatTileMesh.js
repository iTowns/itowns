/**
* Generated On: 2015-10-5
* Class: FlatTileMesh
* Description: Tuile de maillage, noeud du quadtree MNT. Le Materiel est issus du QuadTree ORTHO.
*/

/**
 * 
 * @param {type} NodeMesh
 * @param {type} EllipsoidTileGeometry
 * @param {type} BoundingBox
 * @param {type} defaultValue
 * @param {type} THREE
 * @param {type} Material
 * @returns {EllipsoidTileMesh_L10.FlatTileMesh}
 */
define('Flat/FlatTileMesh',[
    'Renderer/NodeMesh',
    'Flat/FlatTileGeometry',
    'Scene/BoundingBox',
    'Core/defaultValue',
    'THREE',
    'Renderer/BasicMaterial',
    'Core/Math/MathExtented',
    'OBBHelper',
    'SphereHelper'], function(NodeMesh,FlatTileGeometry,BoundingBox,defaultValue,THREE,BasicMaterial,MathExt,OBBHelper,SphereHelper){
 
    function FlatTileMesh(bbox,id){
        //Constructor
        NodeMesh.call( this );
                
                
        this.level      =  Math.floor(Math.log(10000 / bbox.dimension.y )/MathExt.LOG_TWO + 0.5);

        this.bbox       = defaultValue(bbox,new BoundingBox());               
        this.id         = id;
        
        var precision   = 16;               
        var levelMax    = 18;
        
        this.geometricError = Math.pow(2,(levelMax - this.level));        
        this.geometry       = new FlatTileGeometry(bbox,precision,this.level);       
        
        // TODO modif ver world coord de three.js 
        this.absoluteCenter = new THREE.Vector3(bbox.center.x, bbox.center.y, 0);
       
        // TODO ??? 
        this.centerSphere   = new THREE.Vector3().addVectors(this.geometry.boundingSphere.center, this.absoluteCenter);
        this.orthoNeed      = 0;
        this.material       = new BasicMaterial(new THREE.Color(0.8,0.8,0.8));
        this.dot            = 0;
        this.frustumCulled  = false;        
        this.maxChildren    = 4;
        
        var  groupTerrain   = [14,11,7,3];        
        this.levelTerrain   = this.level;
               
        for (var i = 0; i < groupTerrain.length;i++)
        {
            var gLev = groupTerrain[i];
            if(this.level >= gLev)
            {
                this.levelTerrain = gLev;
                break;
            }
        }
       
        var showHelper = true;
        showHelper = false;
        
        if(showHelper && this.level >= 2)
        {
            
            //this.helper  = new THREE.SphereHelper(this.geometry.boundingSphere.radius);
            
            //var text = 'z(' + this.level.toString() + '),r(' + cooWMTS.row + '),c(' + cooWMTS.col + ')';
            var text = (this.level + 1).toString();
            
            this.helper  = new THREE.OBBHelper(this.geometry.OBB,text);
            
            if(this.helper instanceof THREE.SphereHelper)
                         
                this.helper.position.add(this.absoluteCenter);            
            
            else if(this.helper instanceof THREE.OBBHelper)
            
                this.helper.translateZ(this.absoluteCenter.length());
            
        }
    }

    FlatTileMesh.prototype = Object.create( NodeMesh.prototype );

    FlatTileMesh.prototype.constructor = FlatTileMesh;
            
    FlatTileMesh.prototype.dispose = function()
    {          
        // TODO à mettre dans node mesh
        this.material.dispose();       
        this.geometry.dispose();                    
        this.geometry = null;       
        this.material = null;        
    };
    
    /**
    * 

     * @returns {undefined}     */
    FlatTileMesh.prototype.disposeChildren = function()
    {
        while(this.children.length>0)
        {
            var child = this.children[0];
            this.remove(child);
            child.dispose();              
        }
         this.material.visible = true;
    };
    
    FlatTileMesh.prototype.useParent = function()
    {
        return this.level !== this.levelTerrain;
    };
    
    FlatTileMesh.prototype.enableRTC = function(enable)
    {           
        this.material.enableRTC(enable);
    };
    
    FlatTileMesh.prototype.enablePickingRender = function(enable)
    {           
        this.material.enablePickingRender(enable);
    };
    
     FlatTileMesh.prototype.setFog = function(fog)
    {                 
        this.material.setFogDistance(fog);
    };
    
    FlatTileMesh.prototype.setMatrixRTC = function(rtc)
    {                 
        this.material.setMatrixRTC(rtc);
    };
    
    FlatTileMesh.prototype.setDebug = function(enable)
    {                 
        this.material.setDebug(enable);
    };
    
    FlatTileMesh.prototype.setSelected = function(select)
    {                 
        this.material.setSelected(select);        
    };
        
    
    FlatTileMesh.prototype.setAltitude = function(min,max)
    {         
        this.bbox.setAltitude(min,max);        
        var delta = this.geometry.OBB.addHeight(this.bbox);
        var trans = this.absoluteCenter.clone().setLength(delta.y);
        
        var radius = this.geometry.boundingSphere.radius;
        
        this.geometry.boundingSphere.radius = Math.sqrt(delta.x*delta.x + radius*radius);
        this.centerSphere.add(trans);
        
        if(this.helper instanceof THREE.OBBHelper)
        {
            this.helper.update(this.geometry.OBB);
            this.helper.translateZ(this.absoluteCenter.length());
        }
        else if(this.helper instanceof THREE.SphereHelper)
        {
            this.helper.update(this.geometry.boundingSphere.radius);
            this.helper.position.add(trans);
        }       
    };    
    
    FlatTileMesh.prototype.setTextureOrtho = function(texture,id)
    {         
        id = id === undefined ? 0 : id;
        this.material.setTexture(texture,1,id);
        this.checkOrtho();
      //  if(this.material.nbTextures === this.material.Textures_01.length)
        //   this.visible = false;
    };   
    
    FlatTileMesh.prototype.normals = function()
    { 
        return this.geometry.normals;
    };
    
     FlatTileMesh.prototype.fourCorners = function()
    { 
        return this.geometry.fourCorners;
    };
    
    FlatTileMesh.prototype.normal = function()
    { 
        return this.geometry.normal;
    };
    
    FlatTileMesh.prototype.center = function()
    { 
        return this.geometry.center;
    };
    
    FlatTileMesh.prototype.OBB = function()
    { 
        return this.geometry.OBB;
    };
    
    FlatTileMesh.prototype.checkOrtho = function()
    { 

        // TODO : restore condition
        //if(this.orthoNeed+1 === this.material.nbTextures || this.level < 2) 

        {                          
            
            this.loaded = true; 
            this.material.update();
                        
            var parent = this.parent;

            if(parent !== null && parent.childrenLoaded())
            {                                
                parent.wait = false;                  
            }            
        }                             
    };
    
    return FlatTileMesh;
    
});
