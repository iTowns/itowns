/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

import BoundingBox from 'Scene/BoundingBox';

function Quad(bbox) {
    this.northWest = new BoundingBox(bbox.west(), bbox.center.x, bbox.center.y, bbox.north());
    this.northEast = new BoundingBox(bbox.center.x, bbox.east(), bbox.center.y, bbox.north());
    this.southWest = new BoundingBox(bbox.west(), bbox.center.x, bbox.south(), bbox.center.y);
    this.southEast = new BoundingBox(bbox.center.x, bbox.east(), bbox.south(), bbox.center.y);
}

Quad.prototype.array = function () {
    var subdiv = [];

    subdiv.push(this.northWest);
    subdiv.push(this.northEast);
    subdiv.push(this.southWest);
    subdiv.push(this.southEast);

    return subdiv;
};

export default Quad;
