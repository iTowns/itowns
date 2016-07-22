/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

import BoundingBox from 'Scene/BoundingBox';

function Quad(bbox) {
    this.northWest = new BoundingBox(bbox.minCarto.longitude, bbox.center.x, bbox.center.y, bbox.maxCarto.latitude, bbox.center);
    this.northEast = new BoundingBox(bbox.center.x, bbox.maxCarto.longitude, bbox.center.y, bbox.maxCarto.latitude, bbox.center);
    this.southWest = new BoundingBox(bbox.minCarto.longitude, bbox.center.x, bbox.minCarto.latitude, bbox.center.y, bbox.center);
    this.southEast = new BoundingBox(bbox.center.x, bbox.maxCarto.longitude, bbox.minCarto.latitude, bbox.center.y, bbox.center);
}

Quad.prototype.array = function() {
    var subdiv = [];

    subdiv.push(this.northWest);
    subdiv.push(this.northEast);
    subdiv.push(this.southWest);
    subdiv.push(this.southEast);

    return subdiv;
};

export default Quad;
