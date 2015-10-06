/**
* Generated On: 2015-10-5
* Class: Globe
* Description: Le globe est le noeud du globe (node) principale.
*/

define('Globe/Globe',['Scene/Node','Globe/Map'], function(Node,Map){

    function Globe(managerCom){
        //Constructor

        Node.call( this );
        
        this.layers = [];
        
        this.terrain = new Map(managerCom);

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


    /**
    * @documentation: Rafrachi les matériaux en fonction du quadTree ORTHO
    *
    */
    Globe.prototype.QuadTreeToMaterial = function(){
        //TODO: Implement Me 

    };
    
    return Globe;
    
});


