/**
 * Generated On: 2015-10-5
 * Class: SchemeTile
 * Description: Cette classe décrit un découpage spatiale.
 */

function SchemeTile() {
    // Constructor

    this.maximumChildren = 4;
    this.schemeBB = [];
}
/**
 *
 * @param {type} minLo
 * @param {type} maxLo
 * @param {type} minLa
 * @param {type} maxLa
 * @returns {SchemeTile_L8.SchemeTile.prototype@pro;schemeBB@call;push}
 */

SchemeTile.prototype.add = function add(bbox) {
    return this.schemeBB.push(bbox);
};


SchemeTile.prototype.rootCount = function rootCount() {
    return this.schemeBB.length;
};

SchemeTile.prototype.getRoot = function getRoot(id) {
    return this.schemeBB[id];
};


export default SchemeTile;
