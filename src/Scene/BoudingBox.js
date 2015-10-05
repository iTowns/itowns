/**
* Generated On: 2015-10-5
* Class: BoudingBox
* Description: BoundingBox délimite une zone de l'espace. Cette zone est défnie  par des coordonées cartographiques.
*/

function BoudingBox(){
    //Constructor

    this.minLongitude = null;
    this.maxLongitude = null;
    this.minLatitude = null;
    this.maxLatitude = null;
    this.minAltitude = null;
    this.maxAltitude = null;

}


/**
* @documentation: Retourne True si le point est dans la zone
*
* @param point {[object Object]} 
*/
BoudingBox.prototype.isInside = function(point){
    //TODO: Implement Me 

};



module.exports = {BoudingBox:BoudingBox};