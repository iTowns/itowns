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
    'Renderer/Material',
    'Core/Geographic/CoordCarto',
    'text!Renderer/Shader/GlobeVS.glsl',
    'text!Renderer/Shader/GlobeFS.glsl',
    'OBBHelper'], function(NodeMesh,EllipsoidTileGeometry,BoudingBox,defaultValue,THREE,Material,CoordCarto,GlobeVS,GlobeFS,OBBHelper){
 
    function EllipsoidTileMesh(bbox,cooWMTS,ellipsoid,geometryCache){
        //Constructor
        NodeMesh.call( this );
                
        this.level      = cooWMTS.zoom;
        this.cooWMTS    = cooWMTS;
        this.bbox       = defaultValue(bbox,new BoudingBox());        
        
        var precision   = 16;
        
        if (this.level > 14)
            precision   = 32;
//        if (this.level > 15)
//            precision   = 64;
//        else if(this.level > 11)
//            precision   = 64;
//        else if(this.level > 8)
//            precision   = 32;
//        else if (this.level > 6)
//            precision   = 16;
        
        var levelMax = 18;
        
        this.geometricError  = Math.pow(2,levelMax- this.level);        
        this.geometry        = defaultValue(geometryCache,new EllipsoidTileGeometry(bbox,precision,ellipsoid,this.level));       
        var ccarto           = new CoordCarto(bbox.center.x,bbox.center.y,0);                
        
        // TODO modif ver world coord de three.js 
        this.absoluteCenter  = ellipsoid.cartographicToCartesian(ccarto) ;   
       
        // TODO ??? 
        this.centerSphere = new THREE.Vector3().addVectors(this.geometry.boundingSphere.center,this.absoluteCenter);
               
        this.tMat       = new Material(GlobeVS,GlobeFS,bbox,cooWMTS.zoom);                
        this.orthoNeed  = 1;
        this.material   = this.tMat.shader;
        this.dot        = 0;
        this.frustumCulled = false;        
        this.timeInvisible = 0;
        this.maxChildren   = 4;
        
//        if(this.level > 2)
//        {
//            this.helper        = new THREE.OBBHelper(this.geometry.OBB);
//            this.helper.translateZ(this.absoluteCenter.length());
//        }
    }

    EllipsoidTileMesh.prototype = Object.create( NodeMesh.prototype );

    EllipsoidTileMesh.prototype.constructor = EllipsoidTileMesh;
            
    EllipsoidTileMesh.prototype.dispose = function()
    {          
        // TODO à mettre dans node mesh
        this.tMat.dispose();       
        this.geometry.dispose();                    
        this.geometry = null;       
        this.material = null;        
    };
    
    EllipsoidTileMesh.prototype.setRTC = function(enable)
    {         
        this.tMat.uniforms.RTC.value        = enable;
    };
    
     EllipsoidTileMesh.prototype.setFog = function(fog)
    {         
        this.tMat.uniforms.distanceFog.value        = fog;
    };
    
    EllipsoidTileMesh.prototype.setMatrixRTC = function(rtc)
    {         
        this.tMat.uniforms.mVPMatRTC.value  = rtc;
    };
        
    EllipsoidTileMesh.prototype.setTerrain = function(terrain)
    {         
        var texture;
        var pitScale;                        

        if(terrain      === - 1)
            texture = -1;
        else if(terrain === - 2)
        {
            var parentBil   = this.getParentLevel(14);                                
            pitScale        = parentBil.bbox.pitScale(this.bbox);                
            texture         = parentBil.tMat.Textures_00[0];
            
            this.setAltitude(parentBil.bbox.minCarto.altitude,parentBil.bbox.maxCarto.altitude);
            
        }
        else
        {
            texture = terrain.texture;            
            this.setAltitude(terrain.min,terrain.max);            
        }                         
        
        this.tMat.setTexture(texture,0,0,pitScale);      
    };
    
    EllipsoidTileMesh.prototype.setAltitude = function(min,max)
    {         
        this.bbox.setAltitude(min,max);        
        this.geometry.OBB.addHeight(this.bbox);
        
        if( this.helper !== undefined )
        {                        
            this.helper.update(this.geometry.OBB);
            this.helper.translateZ(this.absoluteCenter.length());
        }
//        
        // TODO compute center new center sphere and radius
        
        /*
        if(max > 0)
        for ( t = 0; t <= this.geometry.tops.length; t ++ ) 
        {
            var top = this.geometry.tops[t];
            var elevation = top.clone().normalize().multiplyScalar(max);            
            this.geometry.tops[t].add(elevation);
            
        }
        */
        
    };    
    
    EllipsoidTileMesh.prototype.setTextureOrtho = function(texture,id)
    {         
        id = id === undefined ? 0 : id;
        this.tMat.setTexture(texture,1,id); 
        this.checkOrtho();
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
    
    EllipsoidTileMesh.prototype.checkOrtho = function()
    { 
        
        if(this.orthoNeed === this.tMat.Textures_01.length) 
        {                               
            this.loaded = true;
            this.tMat.update();
            var parent = this.parent;

            if(parent.childrenLoaded())
            {                                
                parent.wait = false;                  
            }
        }                             
    };
    
    
    
    return EllipsoidTileMesh;
    
});