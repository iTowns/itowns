/**
* Generated On: 2015-10-5
* Class: Globe
* Description: Le globe est le noeud du globe (node) principale.
*/

define('Globe/Globe',[    
    'Core/defaultValue',
    'Scene/Layer',
    'Scene/Quadtree',
    'Scene/SchemeTile',
    'Core/Math/MathExtented',
    'Globe/EllipsoidTileMesh',
    'Globe/Atmosphere',
    'Core/System/Capabalities',
    'Core/Geographic/CoordCarto',
    'text!Renderer/Shader/SimpleFS.glsl',
    'text!Renderer/Shader/SimpleVS.glsl',
    'THREE'], function(defaultValue,Layer,Quadtree,SchemeTile,MathExt,EllipsoidTileMesh,Atmosphere,Capabalities,CoordCarto,SimpleFS,SimpleVS,THREE){

    function Globe(scale){
        //Constructor

        Layer.call( this );        
        
        scale       = defaultValue(scale,1.0);
        var caps    = new Capabalities();       
        this.NOIE   = !caps.isInternetExplorer()  ;
                
        this.size       = new THREE.Vector3(6378137, 6378137, 6378137/*6356752.3142451793*/).multiplyScalar(scale);
        this.terrain    = new Quadtree(EllipsoidTileMesh,this.SchemeTileWMTS(2),this.size) ;        
        this.atmosphere = this.NOIE ? new Atmosphere(this.size) : undefined;
        
        /*
        this.meshs      = new Layer();        
        var material = new THREE.ShaderMaterial( {
	uniforms: {
		mVPMatRTC       : { type: "m4", value: new THREE.Matrix4()} ,
                RTC             : { type: "i" , value: 1 }
            },
            vertexShader    : SimpleVS,
            fragmentShader  : SimpleFS,
            wireframe       : true
            
        } );
       
        var geometry = new THREE.SphereGeometry( 20, 32, 32 );
       
        var sphere   = new THREE.Mesh( geometry, material );
        var position = this.ellipsoid().cartographicToCartesian(new CoordCarto().setFromDegreeGeo(2.33,48.87,35));
        sphere.frustumCulled = false;
        sphere.position.copy(position);
        this.meshs.add( sphere );
        */
       
        this.add(this.terrain);        
        
        //this.add(this.meshs);
        
        if(this.atmosphere !== undefined)
            this.add(this.atmosphere);
        
    }

    Globe.prototype = Object.create( Layer.prototype );

    Globe.prototype.constructor = Globe;

    /**
    * @documentation: Rafrachi les matériaux en fonction du quadTree ORTHO
    *
    */
    Globe.prototype.QuadTreeToMaterial = function(){
        //TODO: Implement Me 

    };
    
    Globe.prototype.SchemeTileWMTS = function(type){
        //TODO: Implement Me 
        if(type === 2)
        {
            var schemeT = new SchemeTile();
            schemeT.add(0,MathExt.PI,-MathExt.PI_OV_TWO,MathExt.PI_OV_TWO);
            schemeT.add(MathExt.PI,MathExt.TWO_PI,-MathExt.PI_OV_TWO,MathExt.PI_OV_TWO);
            return schemeT;
        }

    };
    
    Globe.prototype.ellipsoid = function()
    {
        return this.terrain.interCommand.managerCommands.providers[0].ellipsoid;
    };
    
    return Globe;
    
});


