/**
* Generated On: 2015-10-5
* Class: Node
* Description: Tous élément de la scène hérite de Node.
* Cette class permet de construire une structure de Node avec les membres parent et enfants.
*/

function Node(){
    //Constructor

    this.parent = null;
    this.children = null;
    this.bbox = null;
    this.url = null;
    this.content = null;
    this.description = null;
    this.id = null;
    this.saveState = null;
    this.level = null;

}


/**
* @documentation: Retourne le nombre d'enfants du Node
*
* @return  {int} 
*/
Node.prototype.childrenCount = function(){
    //TODO: Implement Me 

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
* @documentation: Cette Méthode permet étendre un objet enfant des fonctions prototypes de Node.
*
* @param childClass {Object} 
*/
Node.prototype.extend = function(childClass){
    //TODO: Implement Me 

};


/**
* @documentation: Ajoute un enfant au Node.
*
* @param child {[object Object]} 
*/
Node.prototype.add = function(child){
    //TODO: Implement Me 

};


/**
* @documentation: Retire un enfant au node.
*
* @param child {[object Object]} 
*/
Node.prototype.remove = function(child){
    //TODO: Implement Me 

};



module.exports = {Node:Node};