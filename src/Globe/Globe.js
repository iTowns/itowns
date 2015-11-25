/**
* Generated On: 2015-10-5
* Class: Globe
* Description: Le globe est le noeud du globe (node) principale.
*/

define('Globe/Globe',[
    'Scene/Layer',
    'Scene/Quadtree',
    'Scene/SchemeTile',
    'Core/Math/MathExtented',
    'Globe/EllipsoidTileMesh',
    'Globe/Atmosphere',
    'Core/System/Capabalities'], function(Layer,Quadtree,SchemeTile,MathExt,EllipsoidTileMesh,Atmosphere,Capabalities){

    function Globe(){
        //Constructor

        Layer.call( this );
        
        var caps    = new Capabalities();       
        this.NOIE   = !caps.isInternetExplorer()  ;
        
        this.terrain    = new Quadtree(EllipsoidTileMesh,this.SchemeTileWMTS(2)) ;        
        this.atmosphere = this.NOIE ? new Atmosphere() : undefined;        
        
        this.add(this.terrain);
        
        if(this.atmosphere !== undefined)
            this.add(this.atmosphere);        
    }

    Globe.prototype = Object.create( Layer.prototype );

    Globe.prototype.constructor = Globe;

    /**
    * @documentation: Gère les interactions entre les QuadTree.
    *
    */
    Globe.prototype.QuadTreeToMesh = function(){
        //TODO: Implement Me 

    };     

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
    
    return Globe;
    
});


