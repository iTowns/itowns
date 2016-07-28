/**
 * Generated On: 2015-10-5
 * Class: Rectangle
 */

import defaultValue from 'Core/defaultValue';

function Rectangle(options) {
    this._west  = defaultValue(options.west, 0);
    this._south = defaultValue(options.south, 0);
    this._east  = defaultValue(options.east, 0);
    this._north = defaultValue(options.north, 0);
}

Rectangle.prototype.getWest = function(){
    return this._west;
};

Rectangle.prototype.getSouth = function(){
   return this._south;
};

Rectangle.prototype.getEast = function(){
   return this._east;
};

Rectangle.prototype.getNorth = function(){
   return this._north;
};

//if Right2 < Right1 && Left2 > Left1 && Top2 < Top1 && Bottom2 > Bottom1
//this is correct only for coordinate positive
Rectangle.prototype.intersects = function(rect){
    if (rect.getEast() < this._west) return false;
    if (rect.getWest() > this._east) return false;
    if (rect.getNorth() < this._south) return false;
    if (rect.getSouth() > this._north) return false;

    return true;
};

Rectangle.prototype.containsPoint = function( v) {
    if (!v) {
        throw new Error('point is required.');
    }

    var longitude = v.x;
    var latitude  = v.y;

    var west = this._west;
    var east = this._east;

    return (longitude > west ) &&
       (longitude < east ) &&
       latitude >= this._south &&
       latitude <= this._north;
};

export default Rectangle;
