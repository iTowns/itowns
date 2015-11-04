/**
* Generated On: 2015-10-5
* Class: Globe
* Description: Le globe est le noeud du globe (node) principale.
*/

define('Globe/Globe',['Scene/Node','Scene/Quadtree','Scene/SchemeTile','Core/Math/MathExtented','Globe/EllipsoidTileMesh','Globe/Atmosphere'], function(Node,Quadtree,SchemeTile,MathExt,EllipsoidTileMesh,Atmosphere){

    function Globe(){
        //Constructor

        Node.call( this );
        
        this.terrain    = new Quadtree(EllipsoidTileMesh,this.SchemeTileWMTS(2));        
        this.atmosphere = new Atmosphere();
        
        this.add(this.terrain);
        this.add(this.atmosphere);
    }

    Globe.prototype = Object.create( Node.prototype );

    Globe.prototype.constructor = Globe;

    /**
    * @documentation: Gère les interactions entre les QuadTree.
    *
    */
    Globe.prototype.QuadTreeToMesh = function(){
        //TODO: Implement Me 

    };
    
    Globe.prototype.getMesh = function(){
        
        return this.terrain.getMesh();
        
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


