/**
* Generated On: 2015-10-5
* Class: Node
* Description: Tous élément de la scène hérite de Node.
* Cette class permet de construire une structure de Node avec les membres parent et enfants.
*/

define('Scene/Node',[], function(){
    

    function Node(){
        //Constructor

        this.parent         = null;
        this.children       = [];
        this.bbox           = null;
        this.url            = null;
        this.content        = null;
        this.description    = null;
        this.id             = null;
        this.saveState      = null;
        this.level          = 0;
        this.screenSpaceError = 0.0;

    }


    /**
    * @documentation: Retourne le nombre d'enfants du Node
    *
    * @return  {int} 
    */
    Node.prototype.childrenCount = function(){

        return this.children.length;

    };
    
    Node.prototype.noChild = function(){

        return this.children.length === 0 ;

    };


    /**
    * @documentation: Rafraichi le Node si le contenu ou  le style a été modifié.
    *
    */
    Node.prototype.update = function(){
        //TODO: Implement Me 

    };


    /**
    * @documentation: Méthode qui créer un memento de l'état de Node avant modification.
    *
    * @return  {[object Object]} 
    */
    Node.prototype.hydrate = function(){
        //TODO: Implement Me 

    };


    /**
    * @documentation: Cette méthode modifie l'état du node en fonction d'un memento.
    *
    * @param mem {[object Object]} 
    */
    Node.prototype.dehydrate = function(mem){
        //TODO: Implement Me 

    };

    /**
    * @documentation: Ajoute un enfant au Node.
    *
    * @param child {[object Object]} 
    */
    Node.prototype.add = function(child){
        //TODO: Implement Me 
        this.children.push(child);
    };

    /**
    * @documentation: Retire un enfant au node.
    *
    * @param child {[object Object]} 
    */
    Node.prototype.remove = function(child){
        //TODO: Implement Me 

    };


    /**
    * @documentation: Cette Méthode permet étendre un objet enfant des fonctions prototypes de Node.
    *
    * @param childClass {Object} 
    */
   
    Node.extend = function(childClass){

        function propName(prop, value)
        {
            for(var i in prop) {
                if (prop[i] === value){
                     return i;
                }
            }
            return false;
        }

        for (var p in Node.prototype)
        {   
            var protoName = propName(Node.prototype,Node.prototype[p]);


            if(protoName !== "add" && protoName !== "remove" )
            {           
                childClass.prototype[protoName] = Node.prototype[p];                                    
            }
        };

    };

    
    return Node;

});

//module.exports = {Node:Node};