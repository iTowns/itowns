/**
 * Generated On: 2015-10-5
 * Class: Node
 * Description: Tous élément de la scène hérite de Node.
 * Cette class permet de construire une structure de Node avec les membres parent et enfants.
 */

function Node() {
    //Constructor

    this.parent = null;
    this.children = [];
    this.bbox = null;
    this.url = null;
    this.content = null;
    this.link = null;
    this.description = null;
    this.id = null;
    this.saveState = null;
    this.level = 0;
    this.screenSpaceError = 0.0;
    this.loaded = false;
    this.pendingSubdivision = false;
    this.pendingLayers = {};
    this.visible = true;
    this.layer = null;


}


Node.prototype.setVisibility = function(show) {
    this.visible = show;
};

Node.prototype.setDisplayed = function( /*show*/ ) {
    // The default node has nothing to display
};

/**
 * @documentation: Retourne le nombre d'enfants du Node
 *
 * @return  {int}
 */
Node.prototype.childrenCount = function() {

    return this.children.length;

};

Node.prototype.noChild = function() {

    return this.children.length === 0;

};

Node.prototype.childrenLoaded = function() {
    // TODO: '4' is specific to Quadtree
    var fourChildren = this.children.length == 4;

    if (!fourChildren) {
        return false;
    }

    if (this.pendingSubdivision) {
        // check children status
        for (var i = 0, max = this.children.length; i < max; i++) {
            if (this.children[i].loaded === false) {
                return false;
            }
        }

        this.pendingSubdivision = false;
    }

    return true;
};

/**
 * @documentation: Rafraichi le Node si le contenu ou  le style a été modifié.
 *
 */
Node.prototype.update = function() {
    //TODO: Implement Me

};

/**
 *
 * @param {type} level
 * @returns {undefined}
 */
Node.prototype.getParentLevel = function(level) {

    var functionToCheck = this.parent.getParentLevel;

    if (!functionToCheck || !(typeof(functionToCheck) === 'function') && (this.parent.level !== level))
        return undefined;

    return (this.parent.level === level) ? this.parent : this.parent.getParentLevel(level);
};

/**
 * @documentation: Méthode qui créer un memento de l'état de Node avant modification.
 *param
 * @return  {[object Object]}
 */
Node.prototype.hydrate = function() {
    //TODO: Implement Me

};


/**
 * @documentation: Cette méthode modifie l'état du node en fonction d'un memento.
 *
 * @param mem {[object Object]}
 */
Node.prototype.dehydrate = function( /*mem*/ ) {
    //TODO: Implement Me

};

/**
 * @documentation: Ajoute un enfant au Node.
 *
 * @param child {[object Object]}
 */
Node.prototype.add = function(child) {
    //TODO: Implement Me
    this.children.push(child);
    child.parent = this;

    child.layer = this;
};

/**
 * @documentation: Retire un enfant au node.
 *
 * @param child {[object Object]}
 */
Node.prototype.remove = function( /*child*/ ) {
    //TODO: Implement Me

};


/**
 * @documentation: Cette Méthode permet étendre un objet enfant des fonctions prototypes de Node.
 *
 * @param childClass {Object}
 */

Node.extend = function(childClass) {

    function propName(prop, value) {
        for (var i in prop) {
            if (prop[i] === value) {
                return i;
            }
        }
        return false;
    }

    for (var p in Node.prototype) {
        var protoName = propName(Node.prototype, Node.prototype[p]);


        if (protoName !== "add" && protoName !== "remove" & protoName !== "setVisibility" && protoName !== "setDisplayed") {
            childClass.prototype[protoName] = Node.prototype[p];
        }
    }

};


export default Node;

//module.exports = {Node:Node};
