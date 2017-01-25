/**
 * Generated On: 2015-10-5
 * Class: Node
 * Description: Tous élément de la scène hérite de Node.
 * Cette class permet de construire une structure de Node avec les membres parent et enfants.
 */

function Node() {
    // Constructor

    this.parent = null;
    this.children = [];
    this.bbox = null;
    this.url = null;
    this.link = null;
    this.id = null;
    this.level = 0;
    this.screenSpaceError = 0.0;
    this.loaded = false;
    // TODO: remove pendingSubdivision and use layerUpdateState instead
    this.pendingSubdivision = false;
    this.layerUpdateState = {};
    this.visible = true;
    this.layer = null;
}


Node.prototype.setVisibility = function setVisibility(show) {
    this.visible = show;
};

Node.prototype.setDisplayed = function setDisplayed(/* show*/) {
    // The default node has nothing to display
};

/**
 * @documentation: Retourne le nombre d'enfants du Node
 *
 * @return  {int}
 */
Node.prototype.childrenCount = function childrenCount() {
    return this.children.length;
};

Node.prototype.noChild = function noChild() {
    return this.children.length === 0;
};

Node.prototype.childrenLoaded = function childrenLoaded() {
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
Node.prototype.update = function update() {
    // TODO: Implement Me

};

/**
 *
 * @param {type} level
 * @returns {undefined}
 */
Node.prototype.getNodeAtLevel = function getNodeAtLevel(level) {
    if (level === this.level) {
        return this;
    }

    var functionToCheck = this.parent.getNodeAtLevel;

    if (!functionToCheck || !(typeof (functionToCheck) === 'function') && (this.parent.level !== level))
        { return undefined; }

    return (this.parent.level === level) ? this.parent : this.parent.getNodeAtLevel(level);
};

/**
 * @documentation: Méthode qui créer un memento de l'état de Node avant modification.
 *param
 * @return  {[object Object]}
 */
Node.prototype.hydrate = function hydrate() {
    // TODO: Implement Me

};


/**
 * @documentation: Cette méthode modifie l'état du node en fonction d'un memento.
 *
 * @param mem {[object Object]}
 */
Node.prototype.dehydrate = function dehydrate(/* mem*/) {
    // TODO: Implement Me

};

/**
 * @documentation: Ajoute un enfant au Node.
 *
 * @param child {[object Object]}
 */
Node.prototype.add = function add(child) {
    // TODO: Implement Me
    this.children.push(child);
    child.parent = this;

    child.layer = this;
};

/**
 * @documentation: Retire un enfant au node.
 *
 * @param child {[object Object]}
 */
Node.prototype.remove = function remove(/* child*/) {
    // TODO: Implement Me

};


/**
 * @documentation: Cette Méthode permet étendre un objet enfant des fonctions prototypes de Node.
 *
 * @param childClass {Object}
 */

Node.extend = function extend(childClass) {
    const membersToIgnore = ['add', 'remove', 'setVisibility', 'setDisplayed'];
    for (const p in Node.prototype) {
        if (Object.prototype.hasOwnProperty.call(Node.prototype, p) && !membersToIgnore.includes(p)) {
            childClass.prototype[p] = Node.prototype[p];
        }
    }
};


export default Node;

// module.exports = {Node:Node};
