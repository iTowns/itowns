/**
* Generated On: 2015-10-5
* Class: Globe
* Description: Le globe est le noeud du globe (node) principale.
*/

define('Globe/Globe',['Scene/Node','Scene/Layer','Globe/EllipsoidTileMesh'], function(Node,Layer,EllipsoidTileMesh){

    function Globe(managerCom){
        //Constructor

        Node.call( this );
        
        this.layers = [];
        
        this.terrain = new Layer(managerCom);
        
        this.terrain.add(new EllipsoidTileMesh());
        
        this.layers.push(this.terrain);
    }

    Globe.prototype = Object.create( Globe.prototype );

    Globe.prototype.constructor = Globe;

    /**
    * @documentation: Gère les interactions entre les QuadTree.
    *
    */
    Globe.prototype.QuadTreeToMesh = function(){
        //TODO: Implement Me 

    };
    
    Globe.prototype.getMesh = function(){

        return this.terrain.children[0];
    };

    /**
    * @documentation: Rafrachi les matériaux en fonction du quadTree ORTHO
    *
    */
    Globe.prototype.QuadTreeToMaterial = function(){
        //TODO: Implement Me 

    };
    
    return Globe;
    
});


