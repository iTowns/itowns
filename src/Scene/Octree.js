/**
 * Generated On: 2015-10-5
 * Class: Octree
 * Description: Structure de données spatiales possedant jusqu'à 8 Nodes
 */

var SpatialHash = require('SpatialHash');

function Octree() {
    //Constructor


}

Octree.prototype = new SpatialHash();


module.exports = {
    Octree: Octree
};
